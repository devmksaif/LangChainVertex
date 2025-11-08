"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JuliaBotFactory = void 0;
exports.createJuliaBotLLM = createJuliaBotLLM;
const model_1 = require("../model/model");
const constants_1 = require("../constants");
class JuliaBotFactory {
    /**
     * Create a JuliaBot instance with OpenAI-compatible interface
     * @param config JuliaBot configuration
     * @returns JuliaBotOpenAI instance
     */
    static createOpenAICompatible(config) {
        return new model_1.JuliaBotOpenAI({
            apiKey: config.bearerToken,
            modelName: config.model || "juliabot",
            temperature: config.temperature || 0.7,
            configuration: {
                baseURL: config.baseURL || `${constants_1.PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
                juliaBotToken: config.bearerToken
            }
        });
    }
    /**
     * Create a JuliaBot instance for workflow generation
     * @param config JuliaBot configuration
     * @returns JuliaBotOpenAI instance optimized for workflow generation
     */
    static createForWorkflowGeneration(config) {
        return new model_1.JuliaBotOpenAI({
            apiKey: config.bearerToken,
            modelName: config.model || "juliabot-workflow",
            temperature: 0.1, // Lower temperature for more consistent JSON output
            configuration: {
                baseURL: config.baseURL || `${constants_1.PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
                juliaBotToken: config.bearerToken
            }
        });
    }
    /**
     * Create a JuliaBot instance for chat interactions
     * @param config JuliaBot configuration
     * @returns JuliaBotOpenAI instance optimized for chat
     */
    static createForChat(config) {
        return new model_1.JuliaBotOpenAI({
            apiKey: config.bearerToken,
            modelName: config.model || "juliabot-chat",
            temperature: 0.7, // Higher temperature for more creative responses
            configuration: {
                baseURL: config.baseURL || `${constants_1.PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
                juliaBotToken: config.bearerToken
            }
        });
    }
    /**
     * Create a JuliaBot instance from credential data
     * @param credData Credential data from Supabase
     * @param options Additional options
     * @returns JuliaBotOpenAI instance
     */
    static createFromCredential(credData, options = {}) {
        const bearerToken = credData.credential?.pb_Token ||
            credData.credential?.PUBLIC_BEARER_TOKEN_JULIA;
        if (!bearerToken) {
            throw new Error("Missing JuliaBot bearer token in credential");
        }
        const config = {
            bearerToken,
            model: options.model,
            temperature: options.temperature
        };
        switch (options.mode) {
            case 'workflow':
                return this.createForWorkflowGeneration(config);
            case 'chat':
                return this.createForChat(config);
            default:
                return this.createOpenAICompatible(config);
        }
    }
}
exports.JuliaBotFactory = JuliaBotFactory;
// Utility function for easy replacement of OpenAI
function createJuliaBotLLM(bearerToken, options = {}) {
    return JuliaBotFactory.createOpenAICompatible({
        bearerToken,
        ...options
    });
}
