// Load environment variables from .env into process.env
import 'dotenv/config';
import { supabase } from './libs/supabase';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
 import express, { json } from "express"
  import cors from "cors"
import { generateWorkflow } from './controllers/workflow-generator';
import { editWorkflow } from './controllers/workflow-editor';
import { executeWorkflow } from './controllers/workflow-executor';
import { aiChat } from './controllers/ai-chat';
 
 

const app = express();
app.use(express.json());
app.use(cors());





app.get("/hello", (req,res) => {
    res.send("HEllo");
})
app.post("/generate-workflow", generateWorkflow);
app.post("/edit-workflow", editWorkflow);
app.post("/execute-workflow", executeWorkflow);
app.post("/ai-chat", aiChat);



app.listen(5000, () => {
    console.info(`DentiBot server started successfully`, {
        port: 5000,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
    });
}).on('error', (error: Error) => {
    console.error('Failed to start server', error, { port: 5000 });
    process.exit(1);
});