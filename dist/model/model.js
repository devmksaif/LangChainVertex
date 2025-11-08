"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelInstance = exports.JuliaBotChatModel = exports.JuliaBotOpenAI = void 0;
const google_genai_1 = require("@langchain/google-genai");
const openai_1 = require("@langchain/openai");
const chat_models_1 = require("@langchain/core/language_models/chat_models");
const messages_1 = require("@langchain/core/messages");
const tools_1 = require("../langchain_tools/tools");
const constants_1 = require("../constants");
// JuliaBot ChatOpenAI-compatible implementation
class JuliaBotOpenAI extends openai_1.ChatOpenAI {
    constructor(fields) {
        // Initialize with dummy OpenAI key to satisfy parent constructor
        super({
            ...fields,
            openAIApiKey: fields.openAIApiKey || fields.apiKey || "dummy-key",
            configuration: {
                ...fields.configuration,
                baseURL: fields.configuration?.baseURL || `${constants_1.PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
            }
        });
        this.juliaBotApiUrl = fields.configuration?.baseURL || `${constants_1.PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`;
        this.juliaBotToken = fields.configuration?.juliaBotToken || fields.openAIApiKey || fields.apiKey || "";
    }
    async _generate(messages) {
        // Convert LangChain messages to JuliaBot format
        const prompt = messages.map(msg => {
            const content = msg.content;
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
                        message: new messages_1.AIMessage(aiResponse)
                    }]
            };
        }
        catch (error) {
            console.error('JuliaBot API Error:', error);
            throw error;
        }
    }
    // Override bindTools to work with JuliaBot
    bindTools(tools) {
        // Store tools for potential use
        this._boundTools = tools;
        return this;
    }
}
exports.JuliaBotOpenAI = JuliaBotOpenAI;
class JuliaBotChatModel extends chat_models_1.BaseChatModel {
    constructor(fields) {
        super(fields);
        this.apiUrl = fields.apiUrl;
        this.bearerToken = fields.bearerToken;
        this.modelName = fields.modelName || "juliabot";
        this.temperature = fields.temperature || 0.7;
    }
    _llmType() {
        return "juliabot";
    }
    async _generate(messages) {
        // Convert LangChain messages to a single prompt
        const prompt = messages.map(msg => {
            if (msg._getType() === 'human')
                return msg.content;
            if (msg._getType() === 'ai')
                return msg.content;
            if (msg._getType() === 'system')
                return msg.content;
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
                    message: new messages_1.AIMessage(aiResponse)
                }]
        };
    }
}
exports.JuliaBotChatModel = JuliaBotChatModel;
class ModelInstance {
    constructor(apikey, temperature, model, provider, instructions, configs, conversationHistory, bearerToken, refreshToken, csrfToken) {
        this.apikey = '';
        this.temperature = 0;
        this.model = "";
        this.provider = "openai";
        this.googleAI = null;
        this.openAI = null;
        this.juliaBot = null;
        this.instructions = '';
        this.configs = null;
        this.conversationhistory = null;
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
    initModel() {
        if (this.provider == 'gemini') {
            this.googleAI = new google_genai_1.ChatGoogleGenerativeAI({
                model: this.model,
                temperature: this.temperature,
                apiKey: this.apikey,
            });
        }
        else if (this.provider === 'openai') {
            this.openAI = new openai_1.ChatOpenAI({
                modelName: this.model,
                temperature: this.temperature,
                apiKey: this.apikey,
            });
        }
        else if (this.provider === 'juliabot') {
            if (!this.bearerToken) {
                throw new Error("Missing JuliaBot bearer token");
            }
            // Use JuliaBotOpenAI for ChatOpenAI compatibility
            this.juliaBot = new JuliaBotOpenAI({
                apiKey: this.bearerToken,
                modelName: this.model || "juliabot",
                temperature: this.temperature,
                configuration: {
                    baseURL: `${constants_1.PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
                    juliaBotToken: this.bearerToken
                }
            });
        }
    }
    getBindTools() {
        if (this.provider == "gemini") {
            return this.googleAI.bindTools(tools_1.toolsAI);
        }
        else if (this.provider === 'openai') {
            return this.openAI.bindTools(tools_1.toolsAI);
        }
        else if (this.provider === 'juliabot') {
            // JuliaBotOpenAI has bindTools compatibility
            return this.juliaBot.bindTools(tools_1.toolsAI);
        }
    }
    // Create enhanced Juliabot with direct tool access
    // Create JuliaBot with OpenAI interface
    createJuliaBotAsOpenAI() {
        if (this.provider !== 'juliabot' || !this.bearerToken) {
            throw new Error("JuliaBotOpenAI requires juliabot provider and bearer token");
        }
        return new JuliaBotOpenAI({
            apiKey: this.bearerToken,
            modelName: this.model || "juliabot",
            temperature: this.temperature,
            configuration: {
                baseURL: `${constants_1.PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
                juliaBotToken: this.bearerToken
            }
        });
    }
}
exports.ModelInstance = ModelInstance;
