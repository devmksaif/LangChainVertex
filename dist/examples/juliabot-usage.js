"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleJuliaBotUsage = exampleJuliaBotUsage;
exports.exampleJuliaBotWithTools = exampleJuliaBotWithTools;
exports.exampleJuliaBotInChain = exampleJuliaBotInChain;
exports.replaceOpenAIWithJuliaBot = replaceOpenAIWithJuliaBot;
const model_1 = require("../model/model");
const messages_1 = require("@langchain/core/messages");
const constants_1 = require("../constants");
// Example: Using JuliaBot with OpenAI-compatible interface
async function exampleJuliaBotUsage() {
    // 1. Initialize JuliaBot with OpenAI-compatible interface
    const juliaBotLLM = new model_1.JuliaBotOpenAI({
        apiKey: "your-juliabot-bearer-token",
        modelName: "juliabot",
        temperature: 0.7,
        configuration: {
            baseURL: `${constants_1.PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
            juliaBotToken: "your-juliabot-bearer-token"
        }
    });
    // 2. Use it exactly like ChatOpenAI
    const messages = [
        new messages_1.SystemMessage("You are a helpful assistant that creates workflows."),
        new messages_1.HumanMessage("Create a simple email workflow")
    ];
    try {
        const response = await juliaBotLLM.invoke(messages);
        console.log("JuliaBot Response:", response.content);
        return response;
    }
    catch (error) {
        console.error("Error:", error);
        throw error;
    }
}
// Example: Using JuliaBot with tools (same as OpenAI)
async function exampleJuliaBotWithTools() {
    const juliaBotLLM = new model_1.JuliaBotOpenAI({
        apiKey: "your-juliabot-bearer-token",
        modelName: "juliabot",
        temperature: 0.7,
        configuration: {
            baseURL: `${constants_1.PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
            juliaBotToken: "your-juliabot-bearer-token"
        }
    });
    // Bind tools (same interface as OpenAI)
    const llmWithTools = juliaBotLLM.bindTools([
    // Your tools here
    ]);
    const messages = [
        new messages_1.SystemMessage("You are a helpful assistant with access to tools."),
        new messages_1.HumanMessage("Send an email to john@example.com with subject 'Hello' and body 'Hi there!'")
    ];
    try {
        const response = await llmWithTools.invoke(messages);
        console.log("JuliaBot with Tools Response:", response.content);
        return response;
    }
    catch (error) {
        console.error("Error:", error);
        throw error;
    }
}
// Example: Using in chains (same as OpenAI)
async function exampleJuliaBotInChain() {
    const { ChatPromptTemplate } = await Promise.resolve().then(() => __importStar(require("@langchain/core/prompts")));
    const juliaBotLLM = new model_1.JuliaBotOpenAI({
        apiKey: "your-juliabot-bearer-token",
        modelName: "juliabot",
        temperature: 0.7,
        configuration: {
            baseURL: `${constants_1.PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
            juliaBotToken: "your-juliabot-bearer-token"
        }
    });
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", "You are a helpful assistant that creates workflows."],
        ["human", "Create a workflow for: {task}"]
    ]);
    // Create chain (same as OpenAI)
    const chain = prompt.pipe(juliaBotLLM);
    try {
        const response = await chain.invoke({ task: "sending automated emails" });
        console.log("JuliaBot Chain Response:", response.content);
        return response;
    }
    catch (error) {
        console.error("Error:", error);
        throw error;
    }
}
// Example: Direct usage in existing OpenAI code
function replaceOpenAIWithJuliaBot() {
    // Instead of:
    // const llm = new ChatOpenAI({
    //     openAIApiKey: "sk-...",
    //     modelName: "gpt-4",
    //     temperature: 0.7,
    // });
    // Use:
    const llm = new model_1.JuliaBotOpenAI({
        apiKey: "your-juliabot-bearer-token",
        modelName: "juliabot",
        temperature: 0.7,
        configuration: {
            baseURL: `${constants_1.PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
            juliaBotToken: "your-juliabot-bearer-token"
        }
    });
    // All the rest of your code remains the same!
    return llm;
}
