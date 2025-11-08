"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables from .env into process.env
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const workflow_generator_1 = require("./controllers/workflow-generator");
const workflow_editor_1 = require("./controllers/workflow-editor");
const workflow_executor_1 = require("./controllers/workflow-executor");
const ai_chat_1 = require("./controllers/ai-chat");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.get("/hello", (req, res) => {
    res.send("HEllo");
});
app.post("/generate-workflow", workflow_generator_1.generateWorkflow);
app.post("/edit-workflow", workflow_editor_1.editWorkflow);
app.post("/execute-workflow", workflow_executor_1.executeWorkflow);
app.post("/ai-chat", ai_chat_1.aiChat);
app.listen(5000, () => {
    console.info(`DentiBot server started successfully`, {
        port: 5000,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
    });
}).on('error', (error) => {
    console.error('Failed to start server', error, { port: 5000 });
    process.exit(1);
});
