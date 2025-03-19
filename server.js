import express from 'express';
import dotenv from 'dotenv';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';
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

// Initialize AWS Bedrock clients
const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Initialize Bedrock management client for listing models
const bedrockManagementClient = new BedrockClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// API endpoint to get available models
app.get('/api/models', async (req, res) => {
    try {
        // Create the command to list foundation models
        const command = new ListFoundationModelsCommand({});
        
        console.log('Fetching available foundation models...');
        
        // Execute the command
        const response = await bedrockManagementClient.send(command);
        
        console.log(`Found ${response.modelSummaries.length} foundation models`);
        
        // Log available Claude models for debugging
        const claudeModels = response.modelSummaries
            .filter(model => model.providerName === 'Anthropic')
            .map(model => ({
                id: model.modelId,
                name: model.modelName,
                status: model.modelLifecycle.status,
                supportedTypes: model.inferenceTypesSupported || []
            }));
            
        console.log('Available Claude models:', JSON.stringify(claudeModels, null, 2));
        
        // Filter and format the models
        const models = response.modelSummaries
            .filter(model => model.modelLifecycle.status === 'ACTIVE') // Only include active models
            .filter(model => {
                // 只包含支持按需调用的模型
                return model.inferenceTypesSupported && 
                       model.inferenceTypesSupported.includes('ON_DEMAND');
            })
            .map(model => ({
                id: model.modelId,
                name: model.modelName,
                provider: model.providerName,
                supportedTypes: model.inferenceTypesSupported || []
            }));
        
        // Add the default model from .env.aws if it exists
        const defaultModelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
        
        // 检查默认模型是否在支持的模型列表中
        const defaultModelSupported = models.some(model => model.id === defaultModelId);
        
        // 如果默认模型不支持按需调用，选择第一个可用的Claude模型作为默认
        let fallbackModelId = defaultModelId;
        if (!defaultModelSupported) {
            const claudeModels = models.filter(model => 
                model.provider === 'Anthropic' && model.id.includes('claude'));
            
            if (claudeModels.length > 0) {
                fallbackModelId = claudeModels[0].id;
                console.log(`默认模型 ${defaultModelId} 不支持按需调用，已切换到 ${fallbackModelId}`);
            }
        }
        
        res.json({ 
            models,
            defaultModelId: fallbackModelId
        });
    } catch (error) {
        console.error('Error fetching models:', error);
        res.status(500).json({ error: 'Failed to fetch available models' });
    }
});

// API endpoint to call Claude model
app.post('/api/chat', async (req, res) => {
    try {
        const { message, modelId } = req.body;
        
        // Use the model ID from the request, or fall back to the one in .env.aws, or use a default
        const selectedModelId = modelId || process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
        
        // Prepare the request body for Claude
        // Include system instructions as part of the user's message
        const systemInstruction = "你是一个专业的AI投资顾问，除非明确指定创作或者生成，否则拒绝虚构内容，回答问题时，关键观点与事实，请引用原文！。\n\n用户问题：";
        const userMessage = systemInstruction + message;
        
        // Check if the model is from Anthropic (Claude)
        const isClaudeModel = selectedModelId.includes('anthropic');
        
        let requestBody;
        
        if (isClaudeModel) {
            // Check if it's Claude 3.7
            const isClaude37 = selectedModelId.includes('claude-3-7');
            
            if (isClaude37) {
                requestBody = {
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 1000,
                    messages: [
                        {
                            role: "system",
                            content: "你是一个专业的AI投资顾问，除非明确指定创作或者生成，否则拒绝虚构内容，回答问题时，关键观点与事实，请引用原文！"
                        },
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: message
                                }
                            ]
                        }
                    ]
                };
            } else {
                requestBody = {
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
            }
        } else {
            // For Llama models
            requestBody = {
                prompt: userMessage,
                max_gen_len: 1000,
                temperature: 0.7,
                top_p: 0.9
            };
        }

        // Create the command
        const command = new InvokeModelCommand({
            modelId: selectedModelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(requestBody)
        });

        // Execute the command
        const response = await bedrockClient.send(command);
        
        // Parse the response based on model type
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        let responseText;
        if (isClaudeModel) {
            // Check if it's Claude 3.7
            const isClaude37 = selectedModelId.includes('claude-3-7');
            
            if (isClaude37 && responseBody.content && responseBody.content.length > 0) {
                responseText = responseBody.content[0].text;
            } else if (responseBody.completion) {
                // For older Claude models
                responseText = responseBody.completion;
            } else if (responseBody.content && responseBody.content.length > 0) {
                // For standard Claude 3 models
                responseText = responseBody.content[0].text;
            } else {
                console.error('Unexpected Claude response format:', responseBody);
                responseText = 'Error: Unexpected response format from Claude model';
            }
        } else {
            // For Llama models
            responseText = responseBody.generation;
        }
        
        res.json({ response: responseText });
    } catch (error) {
        console.error('Error calling model:', error);
        
        // Provide a more descriptive error message based on the error type
        let errorMessage = 'Failed to process your request';
        
        if (error.name === 'ValidationException') {
            if (error.message.includes("on-demand throughput isn't supported")) {
                errorMessage = 'Selected model requires provisioned throughput. Please select a different model or contact your AWS administrator to set up an inference profile.';
                console.log('Switching to a supported model for future requests');
            } else {
                errorMessage = `Validation error: ${error.message}`;
            }
        } else if (error.name === 'AccessDeniedException') {
            errorMessage = 'Access denied. Please check your AWS credentials and permissions.';
        } else if (error.name === 'ThrottlingException') {
            errorMessage = 'Request was throttled. Please try again later.';
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
