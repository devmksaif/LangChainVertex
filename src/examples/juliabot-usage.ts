import { JuliaBotOpenAI } from "../model/model";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PUBLIC_JULIA_BOT_API } from "../constants";

// Example: Using JuliaBot with OpenAI-compatible interface
export async function exampleJuliaBotUsage() {
    
    // 1. Initialize JuliaBot with OpenAI-compatible interface
    const juliaBotLLM = new JuliaBotOpenAI({
        apiKey: "your-juliabot-bearer-token",
        modelName: "juliabot",
        temperature: 0.7,
        configuration: {
            baseURL: `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
            juliaBotToken: "your-juliabot-bearer-token"
        }
    });

    // 2. Use it exactly like ChatOpenAI
    const messages = [
        new SystemMessage("You are a helpful assistant that creates workflows."),
        new HumanMessage("Create a simple email workflow")
    ];

    try {
        const response = await juliaBotLLM.invoke(messages);
        console.log("JuliaBot Response:", response.content);
        return response;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

// Example: Using JuliaBot with tools (same as OpenAI)
export async function exampleJuliaBotWithTools() {
    const juliaBotLLM = new JuliaBotOpenAI({
        apiKey: "your-juliabot-bearer-token",
        modelName: "juliabot",
        temperature: 0.7,
        configuration: {
            baseURL: `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
            juliaBotToken: "your-juliabot-bearer-token"
        }
    });

    // Bind tools (same interface as OpenAI)
    const llmWithTools = juliaBotLLM.bindTools([
        // Your tools here
    ]);

    const messages = [
        new SystemMessage("You are a helpful assistant with access to tools."),
        new HumanMessage("Send an email to john@example.com with subject 'Hello' and body 'Hi there!'")
    ];

    try {
        const response = await llmWithTools.invoke(messages);
        console.log("JuliaBot with Tools Response:", response.content);
        return response;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

// Example: Using in chains (same as OpenAI)
export async function exampleJuliaBotInChain() {
    const { ChatPromptTemplate } = await import("@langchain/core/prompts");
    
    const juliaBotLLM = new JuliaBotOpenAI({
        apiKey: "your-juliabot-bearer-token",
        modelName: "juliabot",
        temperature: 0.7,
        configuration: {
            baseURL: `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
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
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

// Example: Direct usage in existing OpenAI code
export function replaceOpenAIWithJuliaBot() {
    // Instead of:
    // const llm = new ChatOpenAI({
    //     openAIApiKey: "sk-...",
    //     modelName: "gpt-4",
    //     temperature: 0.7,
    // });

    // Use:
    const llm = new JuliaBotOpenAI({
        apiKey: "your-juliabot-bearer-token",
        modelName: "juliabot",
        temperature: 0.7,
        configuration: {
            baseURL: `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
            juliaBotToken: "your-juliabot-bearer-token"
        }
    });

    // All the rest of your code remains the same!
    return llm;
}