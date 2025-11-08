"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editWorkflow = editWorkflow;
const openai_1 = require("@langchain/openai");
const google_genai_1 = require("@langchain/google-genai");
const prompts_1 = require("@langchain/core/prompts");
const supabase_1 = require("../../libs/supabase");
const nodeDefinitions_1 = require("../../utils/nodeDefinitions");
const model_1 = require("../../model/model");
const constants_1 = require("../../constants");
const cleanJson = (content) => {
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
const editPrompt = prompts_1.ChatPromptTemplate.fromMessages([
    [
        "system",
        `
You are an expert workflow editor. Given an existing workflow JSON, user instructions, and available node types, modify the workflow by adding, removing, or updating nodes and edges.

Workflow structure:
- nodes: Array of objects with id, type, position (x, y), data (label, parameters)
- edges: Array of objects with id, source, target, sourceHandle, targetHandle

Output ONLY a valid JSON object with 'nodes' and 'edges' keys containing the updated arrays. Do not include any text, explanations, markdown, code blocks, ticks, commands, or anything else. Start directly with   curly brackets  and end with curly brackets .
    `
    ],
    ["human", "Existing workflow: {workflow}\nInstructions: {instructions}\nAvailable node types: {nodeDefinitions}"],
]);
async function editWorkflow(req, res) {
    const { workflow, message, credential_name, provider, userId, model, credentialId } = req.body;
    if (!workflow || !message || !credential_name || !provider || !userId) {
        res.status(400).json({
            success: false,
            message: "Missing required fields: workflow, instructions, credential_name, provider, userId"
        });
        return;
    }
    // Resolve credential
    const service = provider === 'gemini' ? 'gemini' : 'openai';
    const { data: credData, error: credError } = await supabase_1.supabase
        .from('credentials')
        .select('*')
        .eq('id', credentialId)
        .single();
    if (credError || !credData) {
        res.status(400).json({
            success: false,
            message: `Credential '${credential_name}' not found for ${service} workflow editor.`
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
            // Use JuliaBot with OpenAI-compatible interface
            const llm = new model_1.JuliaBotOpenAI({
                apiKey: bearerToken,
                modelName: model || "juliabot",
                temperature: 0.1,
                configuration: {
                    baseURL: `${constants_1.PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
                    juliaBotToken: bearerToken
                }
            });
            const chain = editPrompt.pipe(llm);
            result = await chain.invoke({
                workflow: JSON.stringify(workflow),
                instructions: message,
                nodeDefinitions: JSON.stringify(nodeDefinitions_1.nodeTypesDefinition)
            });
        }
        else {
            let llm;
            if (provider === "gemini") {
                llm = new google_genai_1.ChatGoogleGenerativeAI({
                    apiKey: apikey,
                    model: model || "gemini-2.5-flash",
                    temperature: 0.1,
                });
            }
            else if (provider === "openai") {
                llm = new openai_1.ChatOpenAI({
                    openAIApiKey: apikey,
                    modelName: model || "gpt-4-turbo-preview",
                    temperature: 0.1,
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: `Unsupported provider: ${provider}`
                });
                return;
            }
            const chain = editPrompt.pipe(llm);
            result = await chain.invoke({ workflow: JSON.stringify(workflow), instructions: message, nodeDefinitions: JSON.stringify(nodeDefinitions_1.nodeTypesDefinition) });
        }
        // Extract JSON from potential markdown
        const content = result.content;
        const cleanedContent = cleanJson(content);
        const updatedWorkflow = JSON.parse(cleanedContent);
        res.json({
            success: true,
            workflow: updatedWorkflow
        });
    }
    catch (error) {
        console.error("Error editing workflow:", error);
        res.status(500).json({
            success: false,
            message: "Failed to edit workflow",
            error: error.message
        });
    }
}
