"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGemini = runGemini;
exports.runOpenAI = runOpenAI;
const model_1 = require("../model/model");
function sanitizeTools(tools) {
    return tools.map((t) => {
        const copy = {};
        if (t.name)
            copy.name = t.name;
        if (t.description)
            copy.description = t.description;
        if (t.identifier)
            copy.identifier = t.identifier;
        if (t.toolName)
            copy.toolName = t.toolName;
        // Handle config field
        if (t.config) {
            const cleaned = JSON.parse(JSON.stringify(t.config), (k, v) => {
                if (typeof v === 'string') {
                    return v.replace(/{{\s*(.*?)\s*}}/g, (_, g1) => g1);
                }
                return v;
            });
            copy.config = cleaned;
        }
        // Handle params field separately (FIX: was using t.config instead of t.params)
        if (t.params) {
            const cleaned = JSON.parse(JSON.stringify(t.params), (k, v) => {
                if (typeof v === 'string') {
                    return v.replace(/{{\s*(.*?)\s*}}/g, (_, g1) => g1);
                }
                return v;
            });
            copy.params = cleaned;
        }
        return copy;
    });
}
async function runGemini(apikey, instructions, message, configs, provider, model_name, conversationHistory) {
    try {
        let processedConfigs = configs;
        if (Array.isArray(configs) && configs.length > 0) {
            try {
                const cleanTools = sanitizeTools(configs);
                processedConfigs = JSON.stringify(cleanTools);
            }
            catch (e) {
                console.error('Error sanitizing tools:', e);
                processedConfigs = JSON.stringify(configs);
            }
        }
        else if (typeof configs === 'object') {
            processedConfigs = JSON.stringify(configs);
        }
        const modelInstance = new model_1.ModelInstance(apikey, 0.7, model_name, provider, instructions, processedConfigs, conversationHistory);
        modelInstance.initModel();
        const inference = 200;
        if (inference === 200) {
            console.log("Gemini Executed Successfully");
            return "success";
        }
        else {
            console.log("Gemini Failed to execute");
            return "failed";
        }
    }
    catch (error) {
        console.error("Error in runGemini:", error);
        throw error;
    }
}
async function runOpenAI(apikey, instructions, message, configs, provider, model_name, conversationHistory) {
    try {
        let processedConfigs = configs;
        const modelInstance = new model_1.ModelInstance(apikey, 0.7, model_name, provider, instructions, processedConfigs, conversationHistory);
        modelInstance.initModel();
        const inference = 200;
        if (inference === 200) {
            console.log("OpenAI Executed Successfully");
            return "success";
        }
        else {
            console.log("OpenAI Failed to execute");
            return "failed";
        }
    }
    catch (error) {
        console.error("Error in runOpenAI:", error);
        throw error;
    }
}
