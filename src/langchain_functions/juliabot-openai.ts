import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";
import { ChatResult } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { PUBLIC_JULIA_BOT_API } from "../constants";

/**
 * JuliaBotOpenAI - A drop-in replacement for ChatOpenAI that uses JuliaBot API
 * Uses the same interface as ChatOpenAI for seamless integration
 */
export class JuliaBotOpenAI extends ChatOpenAI {
  private juliaBotApiUrl: string;
  private juliaBotToken: string;

  constructor(fields: {
    juliaBotToken: string;
    juliaBotApiUrl?: string;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    streaming?: boolean;
  }) {
    // Call parent constructor with dummy OpenAI key (won't be used)
    super({
      openAIApiKey: "dummy-key-for-juliabot",
      modelName: fields.modelName || "juliabot",
      temperature: fields.temperature || 0.7,
      maxTokens: fields.maxTokens,
      streaming: fields.streaming || false,
    });

    this.juliaBotToken = fields.juliaBotToken;
    this.juliaBotApiUrl = fields.juliaBotApiUrl || `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`;
  }

  _llmType(): string {
    return "juliabot-openai";
  }

  /** @ignore */
  async _generate(
    messages: BaseMessage[],
    options?: { stop?: string[] },
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
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
          } as any,
        }],
        llmOutput: {
          tokenUsage: {
            completionTokens: 0,
            promptTokens: 0,
            totalTokens: 0,
          },
        },
      };
    } catch (error: any) {
      console.error('JuliaBot API Error:', error);
      throw new Error(`JuliaBot request failed: ${error.message}`);
    }
  }

  /** @ignore */
  async _call(
    prompt: string,
    options?: { stop?: string[] },
    runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
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
    } catch (error: any) {
      console.error('JuliaBot API Error:', error);
      throw new Error(`JuliaBot request failed: ${error.message}`);
    }
  }
}

/**
 * Factory function to create JuliaBotOpenAI instances with different configurations
 */
export class JuliaBotFactory {
  static createForWorkflowGeneration(config: {
    bearerToken: string;
    model?: string;
    temperature?: number;
  }): JuliaBotOpenAI {
    return new JuliaBotOpenAI({
      juliaBotToken: config.bearerToken,
      modelName: config.model || "juliabot-workflow",
      temperature: config.temperature || 0.1,
    });
  }

  static createForWorkflowEditing(config: {
    bearerToken: string;
    model?: string;
    temperature?: number;
  }): JuliaBotOpenAI {
    return new JuliaBotOpenAI({
      juliaBotToken: config.bearerToken,
      modelName: config.model || "juliabot-editor",
      temperature: config.temperature || 0.1,
    });
  }

  static createForChat(config: {
    bearerToken: string;
    model?: string;
    temperature?: number;
  }): JuliaBotOpenAI {
    return new JuliaBotOpenAI({
      juliaBotToken: config.bearerToken,
      modelName: config.model || "juliabot-chat",
      temperature: config.temperature || 0.7,
    });
  }

  static create(config: {
    bearerToken: string;
    apiUrl?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): JuliaBotOpenAI {
    return new JuliaBotOpenAI({
      juliaBotToken: config.bearerToken,
      juliaBotApiUrl: config.apiUrl,
      modelName: config.model || "juliabot",
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens,
    });
  }
}

export default JuliaBotOpenAI;