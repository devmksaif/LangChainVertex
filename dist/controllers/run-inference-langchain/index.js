"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLangChain = runLangChain;
const service_1 = require("../../services/service");
async function runLangChain(req, res) {
    const { instructions, provider, apikey, tools, configs, message, conversationHistory } = req.body;
    if (!instructions || !provider || !apikey || !tools || !configs || !message) {
        res.status(500).json({ message: "Missing fields " });
        return;
    }
    let runAi;
    if (provider == "gemini") {
        try {
            runAi = await (0, service_1.runGemini)(apikey, instructions, message, tools, "gemini", "gemini-2.5-flash", conversationHistory);
        }
        catch (e) {
            console.log(e.message);
        }
    }
    else if (provider == "openai") {
        try {
            // You can specify the OpenAI model in the request or use a default
            const model_name = req.body.model_name || "gpt-3.5-turbo";
            runAi = await (0, service_1.runOpenAI)(apikey, instructions, message, tools, "openai", model_name, conversationHistory);
        }
        catch (e) {
            console.log(e.message);
        }
    }
    res.json({ status: runAi });
}
