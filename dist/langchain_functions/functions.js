"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAI = runAI;
exports.runOpenAILogic = runOpenAILogic;
const prompts_1 = require("../prompts");
const tools_1 = require("../langchain_tools/tools");
async function runAI(instructions, configs, message, modelWithTools, conversationHistory) {
    try {
        const input = await prompts_1.prompt.formatMessages({
            context: {
                instructions,
                message: message
            },
            configs: configs,
            message: message,
            conversationHistory: conversationHistory
        });
        const res = await modelWithTools.invoke(input);
        console.log("AI Response:", res);
        const tool_calls = res.tool_calls;
        if (tool_calls && tool_calls.length > 0) {
            // Create a tool map for efficient lookups.
            const toolMap = Object.fromEntries(tools_1.toolsAI.map(tool => [tool.name, tool]));
            // Execute tool calls in parallel for efficiency.
            const toolExecutionPromises = tool_calls.map(async (toolCall) => {
                const tool = toolMap[toolCall.name];
                if (tool) {
                    try {
                        console.log(`Executing tool: ${toolCall.name} with args:`, toolCall.args);
                        const result = await tool.invoke(toolCall.args);
                        console.log(`Result for ${toolCall.name}:`, result);
                        return { args: toolCall.args, result };
                    }
                    catch (error) {
                        console.error(`Error executing tool ${toolCall.name}:`, error);
                        return { args: toolCall.args, error: error.message };
                    }
                }
                else {
                    console.warn(`Tool with name "${toolCall.name}" not found.`);
                    return { args: toolCall.args, error: "Tool not found" };
                }
            });
            // Wait for all tool calls to complete.
            const executionResults = await Promise.all(toolExecutionPromises);
            console.log("All tool execution results:", executionResults);
        }
        return 200;
    }
    catch (err) {
        console.error('Error during invoke:', err);
        return 500;
    }
}
async function runOpenAILogic(instructions, configs, message, modelWithTools, conversationHistory) {
    try {
        const chain = prompts_1.promptOpenAI.pipe(modelWithTools);
        const res = await chain.invoke({ conversationHistory, message, context: {
                instructions,
                message
            }, configs });
        const tool_calls = res?.tool_calls;
        if (tool_calls && tool_calls.length > 0) {
            const toolMap = Object.fromEntries(tools_1.toolsAI.map(tool => [tool.name, tool]));
            const toolExecutionPromises = tool_calls.map(async (toolCall) => {
                const tool = toolMap[toolCall.name];
                if (tool) {
                    try {
                        console.log(`Executing tool: ${toolCall.name} with args:`, toolCall.args);
                        const result = await tool.invoke(toolCall.args);
                        console.log(`Result for ${toolCall.name}:`, result);
                        return { toolCall, result };
                    }
                    catch (error) {
                        console.error(`Error executing tool ${toolCall.name}:`, error);
                        return { toolCall, error: error.message };
                    }
                }
                else {
                    console.warn(`Tool with name "${toolCall.name}" not found.`);
                    return { toolCall, error: "Tool not found" };
                }
            });
            const executionResults = await Promise.all(toolExecutionPromises);
            console.log("All tool execution results:", executionResults);
        }
        return 200;
    }
    catch (err) {
        console.error('Error during OpenAI invoke:', err);
        return 500;
    }
}
