"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JuliaBotFactory = exports.JuliaBotOpenAI = void 0;
const openai_1 = require("@langchain/openai");
const constants_1 = require("../constants");
/**
 * JuliaBotOpenAI - A drop-in replacement for ChatOpenAI that uses JuliaBot API
 * Uses the same interface as ChatOpenAI for seamless integration
 */
class JuliaBotOpenAI extends openai_1.ChatOpenAI {
    constructor(fields) {
        // Call parent constructor with dummy OpenAI key (won't be used)
        super({
            openAIApiKey: "dummy-key-for-juliabot",
            modelName: fields.modelName || "juliabot",
            temperature: fields.temperature || 0.7,
            maxTokens: fields.maxTokens,
            streaming: fields.streaming || false,
        });
        this.juliaBotToken = fields.juliaBotToken;
        this.juliaBotApiUrl = fields.juliaBotApiUrl || `${constants_1.PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`;
    }
    _llmType() {
        return "juliabot-openai";
    }
    /** @ignore */
    async _generate(messages, options, runManager) {
        // Convert LangChain messages to JuliaBot format
        const prompt = messages.map(msg => {
            const content = msg.content.toString();
            const type = msg._getType();
            switch (type) {
                case 'system':
                    return `System: ${content}`;
                case 'human':
                    return `User: ${content}`;
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
                    'Authorization': `Bearer ${this.juliaBotToken}`,
                },
                body: JSON.stringify({
                    new_chat: true,
                    message: prompt,
                    include_search: false,
                    type: "chatAssistant"
                }),
            });
            if (!response.ok) {
                throw new Error(`JuliaBot API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            const aiResponse = data.data?.aiResponse || data.aiResponse || data.response || "";
            // Return in ChatOpenAI compatible format
            return {
                generations: [{
                        text: aiResponse,
                        message: {
                            content: aiResponse,
                            additional_kwargs: {},
                        },
                    }],
                llmOutput: {
                    tokenUsage: {
                        completionTokens: 0,
                        promptTokens: 0,
                        totalTokens: 0,
                    },
                },
            };
        }
        catch (error) {
            console.error('JuliaBot API Error:', error);
            throw new Error(`JuliaBot request failed: ${error.message}`);
        }
    }
    /** @ignore */
    async _call(prompt, options, runManager) {
        try {
            const response = await fetch(this.juliaBotApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.juliaBotToken}`,
                },
                body: JSON.stringify({
                    new_chat: true,
                    message: prompt,
                    include_search: false,
                    type: "chatAssistant"
                }),
            });
            if (!response.ok) {
                throw new Error(`JuliaBot API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return data.data?.aiResponse || data.aiResponse || data.response || "";
        }
        catch (error) {
            console.error('JuliaBot API Error:', error);
            throw new Error(`JuliaBot request failed: ${error.message}`);
        }
    }
}
exports.JuliaBotOpenAI = JuliaBotOpenAI;
/**
 * Factory function to create JuliaBotOpenAI instances with different configurations
 */
class JuliaBotFactory {
    static createForWorkflowGeneration(config) {
        return new JuliaBotOpenAI({
            juliaBotToken: config.bearerToken,
            modelName: config.model || "juliabot-workflow",
            temperature: config.temperature || 0.1,
        });
    }
    static createForWorkflowEditing(config) {
        return new JuliaBotOpenAI({
            juliaBotToken: config.bearerToken,
            modelName: config.model || "juliabot-editor",
            temperature: config.temperature || 0.1,
        });
    }
    static createForChat(config) {
        return new JuliaBotOpenAI({
            juliaBotToken: config.bearerToken,
            modelName: config.model || "juliabot-chat",
            temperature: config.temperature || 0.7,
        });
    }
    static create(config) {
        return new JuliaBotOpenAI({
            juliaBotToken: config.bearerToken,
            juliaBotApiUrl: config.apiUrl,
            modelName: config.model || "juliabot",
            temperature: config.temperature || 0.7,
            maxTokens: config.maxTokens,
        });
    }
}
exports.JuliaBotFactory = JuliaBotFactory;
exports.default = JuliaBotOpenAI;
