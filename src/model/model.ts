import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatResult } from "@langchain/core/outputs";
import { toolsAI } from "../langchain_tools/tools";
import { PUBLIC_JULIA_BOT_API } from "../constants";

// JuliaBot ChatOpenAI-compatible implementation
export class JuliaBotOpenAI extends ChatOpenAI {
    private juliaBotApiUrl: string;
    private juliaBotToken: string;

    constructor(fields: {
        openAIApiKey?: string;
        apiKey?: string;
        modelName?: string;
        model?: string;
        temperature?: number;
        configuration?: {
            baseURL?: string;
            juliaBotToken?: string;
        };
    }) {
        // Initialize with dummy OpenAI key to satisfy parent constructor
        super({
            ...fields,
            openAIApiKey: fields.openAIApiKey || fields.apiKey || "dummy-key",
            configuration: {
                ...fields.configuration,
                baseURL: fields.configuration?.baseURL || `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
            }
        });

        this.juliaBotApiUrl = fields.configuration?.baseURL || `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`;
        this.juliaBotToken = fields.configuration?.juliaBotToken || fields.openAIApiKey || fields.apiKey || "";
    }

    async _generate(messages: BaseMessage[]): Promise<ChatResult> {
        // Convert LangChain messages to JuliaBot format
        const prompt = messages.map(msg => {
            const content = msg.content as string;
            const type = msg._getType();
            
            switch (type) {
                case 'system':
                    return `System: ${content}`;
                case 'human':
                    return `Human: ${content}`;
                case 'ai':
                    return `Assistant: ${content}`;
                default:
                    return content;
            }
        }).join('\n');

        try {
            const response = await fetch(this.juliaBotApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.juliaBotToken}`
                },
                body: JSON.stringify({
                    new_chat: true,
                    message: prompt,
                    include_search: false,
                    type: "chatAssistant"
                })
            });

            if (!response.ok) {
                throw new Error(`JuliaBot API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const aiResponse = data.data?.aiResponse || data.aiResponse || data.response || "";

            return {
                generations: [{
                    text: aiResponse,
                    message: new AIMessage(aiResponse)
                }]
            };
        } catch (error) {
            console.error('JuliaBot API Error:', error);
            throw error;
        }
    }

    // Override bindTools to work with JuliaBot
    bindTools(tools: any[]): JuliaBotOpenAI {
        // Store tools for potential use
        (this as any)._boundTools = tools;
        return this;
    }
}

export class JuliaBotChatModel extends BaseChatModel {
    apiUrl: string;
    bearerToken: string;
    modelName: string;
    temperature: number;

    constructor(fields: any) {
        super(fields);
        this.apiUrl = fields.apiUrl;
        this.bearerToken = fields.bearerToken;
        this.modelName = fields.modelName || "juliabot";
        this.temperature = fields.temperature || 0.7;
    }

    _llmType(): string {
        return "juliabot";
    }

    async _generate(messages: BaseMessage[]): Promise<ChatResult> {
        // Convert LangChain messages to a single prompt
        const prompt = messages.map(msg => {
            if (msg._getType() === 'human') return msg.content;
            if (msg._getType() === 'ai') return msg.content;
            if (msg._getType() === 'system') return msg.content;
            return msg.content;
        }).join('\n');

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.bearerToken}`
            },
            body: JSON.stringify({
                new_chat: true,
                message: prompt,
                include_search: false,
                type: "chatAssistant"
            })
        });

        if (!response.ok) {
            throw new Error(`JuliaBot API error: ${response.statusText}`);
        }

        const data = await response.json();
        const aiResponse = data.data.aiResponse;

        return {
            generations: [{
                text: aiResponse,
                message: new AIMessage(aiResponse)
            }]
        };
    }
}

export class ModelInstance {
    apikey = '';
    temperature = 0;
    model = "";
    provider = "openai"
    googleAI: ChatGoogleGenerativeAI = null;
    openAI: ChatOpenAI = null;
    juliaBot: JuliaBotChatModel | JuliaBotOpenAI = null;
    instructions: string = ''
    configs: any = null;
    conversationhistory: any = null;
    bearerToken?: string;
    refreshToken?: string;
    csrfToken?: string;
    
    constructor(apikey: string, temperature: number, model: string, provider: string, instructions: string, configs: any, conversationHistory: any, bearerToken?: string, refreshToken?: string, csrfToken?: string) {
        this.apikey = apikey;
        this.temperature = temperature;
        this.model = model;
        this.provider = provider;
        this.instructions = instructions;
        this.configs = configs;
        this.conversationhistory = conversationHistory;
        this.bearerToken = bearerToken;
        this.refreshToken = refreshToken;
        this.csrfToken = csrfToken;
    }
 
    initModel(){
        if(this.provider == 'gemini'){
            this.googleAI = new ChatGoogleGenerativeAI({
                model: this.model,
                temperature: this.temperature,
                apiKey: this.apikey,
            });
        } else if (this.provider === 'openai') {
            this.openAI = new ChatOpenAI({
                modelName: this.model,
                temperature: this.temperature,
                apiKey: this.apikey,
            });
        } else if (this.provider === 'juliabot') {
            if (!this.bearerToken) {
                throw new Error("Missing JuliaBot bearer token");
            }
            
            // Use JuliaBotOpenAI for ChatOpenAI compatibility
            this.juliaBot = new JuliaBotOpenAI({
                apiKey: this.bearerToken,
                modelName: this.model || "juliabot",
                temperature: this.temperature,
                configuration: {
                    baseURL: `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
                    juliaBotToken: this.bearerToken
                }
            });
        }
    }

    getBindTools(){
        if(this.provider == "gemini"){
            return this.googleAI.bindTools(toolsAI);
        } else if (this.provider === 'openai') {
            return this.openAI.bindTools(toolsAI);
        } else if (this.provider === 'juliabot') {
            // JuliaBotOpenAI has bindTools compatibility
            return (this.juliaBot as JuliaBotOpenAI).bindTools(toolsAI);
        }
    }

    // Create enhanced Juliabot with direct tool access
     

    // Create JuliaBot with OpenAI interface
    createJuliaBotAsOpenAI(): JuliaBotOpenAI {
        if (this.provider !== 'juliabot' || !this.bearerToken) {
            throw new Error("JuliaBotOpenAI requires juliabot provider and bearer token");
        }
        
        return new JuliaBotOpenAI({
            apiKey: this.bearerToken,
            modelName: this.model || "juliabot",
            temperature: this.temperature,
            configuration: {
                baseURL: `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
                juliaBotToken: this.bearerToken
            }
        });
    }
}