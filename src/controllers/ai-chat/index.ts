import { Request, Response } from "express";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { supabase } from "../../libs/supabase";
import { ModelInstance } from "../../model/model";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { JuliaBotOpenAI } from "../../model/model";
import { PUBLIC_JULIA_BOT_API } from "../../constants";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}



export async function aiChat(req: Request, res: Response) {
    const { messages, model, credential_name, mode, currentNodes, currentEdges, userId, credentialId } = req.body;
    console.log(messages, model, credential_name, mode, currentNodes, currentEdges, userId, credentialId )
    if (!messages || !model || !credentialId || !userId) {
        res.status(400).json({
            success: false,
            message: "Missing required fields: messages, model, credential_name, userId"
        });
        return;
    }

    try {
        const provider = model.startsWith('gemini') ? 'gemini' : (model.includes('juliabot') ? 'juliabot' : 'openai');
        const service = provider;

        // Resolve credential
        const { data: credData, error: credError } = await supabase
            .from('credentials')
            .select('*')
            .eq('id', credentialId)
            .single();

        if (credError) {
            console.log(credError)
            res.status(400).json({
                success: false,
                message: `Credential '${credential_name}' not found for ${service}. ai chat`
            });

            return;
        }

        const apikey = credData.credential?.apiKey || credData.credential?.key || credData.credential?.pb_Token;
        console.log(credData)
        if (!apikey) {
            res.status(400).json({
                success: false,
                message: "API key not found in credential."
            });
            return;
        }

        // Define tools
        const buildWorkflowTool = tool(
          async ({ description }: { description: string }) => {
            try {
              const response = await fetch(`${process.env.BASE_URL || 'http://localhost:6000'}/generate-workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: description,
                  credential_name,
                  provider,
                  userId,
                  credentialId,
                  model
                })
              });
              const data = await response.json();
              return JSON.stringify(data.workflow);
            } catch (error) {
              return `Error building workflow: ${error.message}`;
            }
          },
          {
            name: "build_workflow",
            description: "Build a new workflow based on the user's description. Input: description of the workflow to create.",
            schema: {
              type: "object",
              properties: {
                description: {
                  type: "string",
                  description: "Detailed description of the workflow to build"
                }
              },
              required: ["description"]
            }
          }
        );

        const editWorkflowTool = tool(
          async ({ instructions }: { instructions: string }) => {
            try {
              const response = await fetch(`${process.env.BASE_URL || 'http://localhost:6000'}/edit-workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  workflow: { nodes: currentNodes, edges: currentEdges },
                  message: instructions,
                  credential_name,
                  provider,
                  userId,
                  credentialId,
                  model
                })
              });
              const data = await response.json();
              return JSON.stringify(data.workflow);
            } catch (error) {
              return `Error editing workflow: ${error.message}`;
            }
          },
          {
            name: "edit_workflow",
            description: "Edit an existing workflow based on instructions. Input: instructions for editing the workflow.",
            schema: {
              type: "object",
              properties: {
                instructions: {
                  type: "string",
                  description: "Detailed instructions for editing the workflow"
                }
              },
              required: ["instructions"]
            }
          }
        );

        const tools = mode === 'create' ? [buildWorkflowTool] : [editWorkflowTool];

        let response;
        if (provider === "juliabot") {
            const bearerToken = credData.credential?.pb_Token || credData.credential?.PUBLIC_BEARER_TOKEN_JULIA;
            const refreshToken = credData.credential?.rf_Token || credData.credential?.PUBLIC_REFRESH_TOKEN_JULIA;
            const csrfToken = credData.credential?.csrfToken || credData.credential?.PUBLIC_CSRF_JULIA;

            if (!bearerToken) {
                res.status(400).json({
                    success: false,
                    message: "Missing JuliaBot bearer token in credential."
                });
                return;
            }

            // Use JuliaBot with OpenAI-compatible interface and tools
            const llm = new JuliaBotOpenAI({
                apiKey: bearerToken,
                modelName: model || "juliabot",
                temperature: 0.7,
                configuration: {
                    baseURL: `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
                    juliaBotToken: bearerToken
                }
            }).bindTools(tools);

            // Prepare messages for LLM
            const langchainMessages = messages.map((msg: Message) => {
                if (msg.role === 'assistant') return new AIMessage(msg.content);
                if (msg.role === 'user') return new HumanMessage(msg.content);
                return new HumanMessage(msg.content);
            });

            // Add system prompt based on mode
            const systemPrompt = mode === 'create'
                ? `You are an AI assistant helping users build workflows. Engage in natural conversation to understand their requirements. When the user expresses readiness to build the workflow (e.g., "build it", "create the workflow", "let's do it"), use the build_workflow tool to generate the workflow. Do not use the tool unless the user is ready to proceed.`
                : `You are an AI assistant helping users edit workflows. The current workflow has nodes: ${JSON.stringify(currentNodes?.map(n => ({ id: n.id, type: n.type, data: n.data.label })))} and edges: ${JSON.stringify(currentEdges)}. Engage in natural conversation to understand their edit requirements. When the user expresses readiness to apply changes (e.g., "apply the changes", "edit the workflow", "update it"), use the edit_workflow tool to modify the workflow. Do not use the tool unless the user is ready to proceed.`;

            langchainMessages.unshift(new SystemMessage(systemPrompt));

            response = await llm.invoke(langchainMessages);
        } else {
            let llm;
            if (provider === "openai") {
                llm = new ChatOpenAI({
                    apiKey: apikey,
                    modelName: model,
                    temperature: 0.7,
                }).bindTools(tools);
            } else if (provider === "gemini") {
                llm = new ChatGoogleGenerativeAI({
                    apiKey: apikey,
                    model: model,
                    temperature: 0.7,
                }).bindTools(tools);
            } else {
                res.status(400).json({
                    success: false,
                    message: "Unsupported provider."
                });
                return;
            }

            // Prepare messages for LLM
            const langchainMessages = messages.map((msg: Message) => ({
                role: msg.role,
                content: msg.content
            }));

            // Add system prompt based on mode
            const systemPrompt = mode === 'create'
                ? `You are an AI assistant helping users build workflows. Engage in natural conversation to understand their requirements. When the user expresses readiness to build the workflow (e.g., "build it", "create the workflow", "let's do it"), use the build_workflow tool to generate the workflow. Do not use the tool unless the user is ready to proceed.`
                : `You are an AI assistant helping users edit workflows. The current workflow has nodes: ${JSON.stringify(currentNodes?.map(n => ({ id: n.id, type: n.type, data: n.data.label })))} and edges: ${JSON.stringify(currentEdges)}. Engage in natural conversation to understand their edit requirements. When the user expresses readiness to apply changes (e.g., "apply the changes", "edit the workflow", "update it"), use the edit_workflow tool to modify the workflow. Do not use the tool unless the user is ready to proceed.`;

            langchainMessages.unshift({
                role: 'system',
                content: systemPrompt
            });

            response = await llm.invoke(langchainMessages);
        }

        let content = response.content;
        if (response.toolCalls && response.toolCalls.length > 0) {
            for (const toolCall of response.toolCalls) {
            if (toolCall.name === 'build_workflow' && mode === 'create') {
                const result = await buildWorkflowTool.invoke(toolCall.args);
                content = JSON.stringify(result);
            } else if (toolCall.name === 'edit_workflow' && mode === 'edit') {
                const result = await editWorkflowTool.invoke(toolCall.args);
                content = JSON.stringify(result);
            }
        }
    }

        res.json({
            success: true,
            content
        });

    } catch (error) {
        console.error("Error in aiChat:", error);
        res.status(500).json({
            success: false,
            message: "Failed to process chat",
            error: error.message
        });
    }
}