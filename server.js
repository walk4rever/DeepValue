import express from 'express';
import dotenv from 'dotenv';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load AWS credentials from .env.aws file
dotenv.config({ path: '.env.aws' });

const app = express();
const PORT = process.env.PORT || 3001; // Changed port to 3001

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Initialize AWS Bedrock client
const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// API endpoint to call Claude model
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        // Prepare the request body for Claude
        // Include system instructions as part of the user's message
        const systemInstruction = "你是一个专业的AI投资顾问，除非明确指定创作或者生成，否则拒绝虚构内容，回答问题时，关键观点与事实，请引用原文！。\n\n用户问题：";
        const userMessage = systemInstruction + message;
        
        const requestBody = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1000,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: userMessage
                        }
                    ]
                }
            ]
        };

        // Create the command
        const command = new InvokeModelCommand({
            modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(requestBody)
        });

        // Execute the command
        const response = await bedrockClient.send(command);
        
        // Parse the response
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        res.json({ response: responseBody.content[0].text });
    } catch (error) {
        console.error('Error calling Claude model:', error);
        res.status(500).json({ error: 'Failed to process your request' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
