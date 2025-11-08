import { Request, Response } from "express";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { workflowBuilderPrompt } from "../../prompts/workflow-builder";
import { nodeTypesDefinition } from "../../utils/nodeDefinitions";
import { supabase } from "../../libs/supabase";
import { ModelInstance, JuliaBotOpenAI } from "../../model/model";
import { PUBLIC_JULIA_BOT_API } from "../../constants";

const cleanJson = (content: string): string => {
    // Remove markdown code blocks
    let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    // Find the first { and last }
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
        cleaned = cleaned.substring(start, end + 1);
    }
    return cleaned.trim();
};

export async function generateWorkflow(req: Request, res: Response) {
    
    const { message, credential_name, provider, userId, model, credentialId} = req.body;
    console.log(message, credential_name, provider, userId, model, credentialId)
    if (!message || !credential_name || !provider || !userId || !model) {
        res.status(400).json({
            success: false,
            message: "Missing required fields: message, credential_name, provider, userId, model"
        });
        return;
    }

    // Resolve credential
    const service = provider === 'gemini' ? 'gemini' : 'openai';
    const { data: credData, error: credError } = await supabase
        .from('credentials')
        .select('*')
        .eq('id', credentialId)
        .single();

    if (credError || !credData) {
        res.status(400).json({
            success: false,
            message: `Credential '${credential_name}' not found for ${service}. workflow Editor`
        });
        return;
    }

    const apikey = credData.credential?.apiKey || credData.credential?.key;
    if (!apikey) {
        res.status(400).json({
            success: false,
            message: "API key not found in credential."
        });
        return;
    }

    try {
        let result;
        if (provider === "juliabot") {
            // Fetch tokens from credentials
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

            // Use JuliaBotOpenAI for ChatOpenAI-compatible interface
            const llm = new JuliaBotOpenAI({
                apiKey: bearerToken,
                modelName: model || "juliabot",
                temperature: 0.1,
                configuration: {
                    baseURL: `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
                    juliaBotToken: bearerToken
                }
            });

            const messages = await workflowBuilderPrompt.formatMessages({
                message,
                nodeDefinitions: JSON.stringify(nodeTypesDefinition, null, 2)
            });

            result = await llm.invoke(messages);
        } else {
            let llm;
            if (provider === "gemini") {
                llm = new ChatGoogleGenerativeAI({
                    apiKey: apikey,
                    model: model || "gemini-2.5-flash",
                    temperature: 0.1,
                });
            } else if (provider === "openai") {
                llm = new ChatOpenAI({
                    openAIApiKey: apikey,
                    modelName: model || "gpt-4-turbo-preview",
                    temperature: 0.1,
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: `Unsupported provider: ${provider}`
                });
                return;
            }

            const messages = await workflowBuilderPrompt.formatMessages({
                message,
                nodeDefinitions: JSON.stringify(nodeTypesDefinition, null, 2)
            });

            result = await llm.invoke(messages);
        }

        // Extract JSON from potential markdown
        const content = (result as any).content;
        const cleanedContent = cleanJson(content);
        const workflowJson = JSON.parse(cleanedContent);

        res.json({
            success: true,
            workflow: workflowJson
        });
    } catch (error) {
        console.error("Error generating workflow:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate workflow",
            error: error.message
        });
    }
}
