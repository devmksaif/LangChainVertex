import { JuliaBotOpenAI } from "../model/model";
import { PUBLIC_JULIA_BOT_API } from "../constants";

export interface JuliaBotConfig {
    bearerToken: string;
    model?: string;
    temperature?: number;
    baseURL?: string;
}

export class JuliaBotFactory {
    /**
     * Create a JuliaBot instance with OpenAI-compatible interface
     * @param config JuliaBot configuration
     * @returns JuliaBotOpenAI instance
     */
    static createOpenAICompatible(config: JuliaBotConfig): JuliaBotOpenAI {
        return new JuliaBotOpenAI({
            apiKey: config.bearerToken,
            modelName: config.model || "juliabot",
            temperature: config.temperature || 0.7,
            configuration: {
                baseURL: config.baseURL || `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
                juliaBotToken: config.bearerToken
            }
        });
    }

    /**
     * Create a JuliaBot instance for workflow generation
     * @param config JuliaBot configuration
     * @returns JuliaBotOpenAI instance optimized for workflow generation
     */
    static createForWorkflowGeneration(config: JuliaBotConfig): JuliaBotOpenAI {
        return new JuliaBotOpenAI({
            apiKey: config.bearerToken,
            modelName: config.model || "juliabot-workflow",
            temperature: 0.1, // Lower temperature for more consistent JSON output
            configuration: {
                baseURL: config.baseURL || `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
                juliaBotToken: config.bearerToken
            }
        });
    }

    /**
     * Create a JuliaBot instance for chat interactions
     * @param config JuliaBot configuration
     * @returns JuliaBotOpenAI instance optimized for chat
     */
    static createForChat(config: JuliaBotConfig): JuliaBotOpenAI {
        return new JuliaBotOpenAI({
            apiKey: config.bearerToken,
            modelName: config.model || "juliabot-chat",
            temperature: 0.7, // Higher temperature for more creative responses
            configuration: {
                baseURL: config.baseURL || `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
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
    static createFromCredential(
        credData: any, 
        options: { 
            model?: string; 
            temperature?: number; 
            mode?: 'workflow' | 'chat' | 'general' 
        } = {}
    ): JuliaBotOpenAI {
        const bearerToken = credData.credential?.pb_Token || 
                          credData.credential?.PUBLIC_BEARER_TOKEN_JULIA;

        if (!bearerToken) {
            throw new Error("Missing JuliaBot bearer token in credential");
        }

        const config: JuliaBotConfig = {
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

// Utility function for easy replacement of OpenAI
export function createJuliaBotLLM(bearerToken: string, options: {
    model?: string;
    temperature?: number;
    baseURL?: string;
} = {}): JuliaBotOpenAI {
    return JuliaBotFactory.createOpenAICompatible({
        bearerToken,
        ...options
    });
}