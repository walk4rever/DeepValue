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

// In-memory store for chat histories
const chatSessions = {};

// Configuration for chat session management
const SESSION_CONFIG = {
    maxSessionsInMemory: 1000,      // Maximum number of sessions to keep in memory
    maxSessionAge: 1000 * 60 * 60 * 24 * 7,  // Seven days in milliseconds
    cleanupInterval: 1000 * 60 * 60 * 6      // Cleanup every 6 hours
};

// Memory management for chat sessions - periodically clean up old sessions
function cleanupOldSessions() {
    try {
        console.log('Starting chat session cleanup...');
        
        const now = Date.now();
        const sessionIds = Object.keys(chatSessions);
        let cleanupCount = 0;
        
        // If we have more sessions than the max, clean up based on age and limits
        if (sessionIds.length > SESSION_CONFIG.maxSessionsInMemory) {
            // Collect sessions with timestamps
            const sessionsWithTime = sessionIds.map(id => {
                // Find the most recent message timestamp in the session
                const timestamps = chatSessions[id].map(entry => new Date(entry.timestamp).getTime());
                const lastActivity = timestamps.length > 0 ? Math.max(...timestamps) : 0;
                
                return {
                    id,
                    lastActivity: lastActivity || 0
                };
            });
            
            // Sort sessions by activity time (oldest first)
            sessionsWithTime.sort((a, b) => a.lastActivity - b.lastActivity);
            
            // Determine how many sessions to remove to get under the maximum
            const sessionsToRemove = sessionsWithTime.length - SESSION_CONFIG.maxSessionsInMemory;
            
            if (sessionsToRemove > 0) {
                console.log(`Removing ${sessionsToRemove} old sessions to stay under limit...`);
                
                // Remove the oldest sessions
                sessionsWithTime.slice(0, sessionsToRemove).forEach(session => {
                    delete chatSessions[session.id];
                    cleanupCount++;
                });
            }
        }
        
        // Also remove any sessions older than maxSessionAge
        sessionIds.forEach(id => {
            // Skip if already cleaned up
            if (!chatSessions[id]) return;
            
            // Find most recent timestamp in this session
            const timestamps = chatSessions[id].map(entry => new Date(entry.timestamp).getTime());
            const lastActivity = timestamps.length > 0 ? Math.max(...timestamps) : 0;
            
            // If session is older than max age, remove it
            if (now - lastActivity > SESSION_CONFIG.maxSessionAge) {
                delete chatSessions[id];
                cleanupCount++;
            }
        });
        
        console.log(`Cleanup complete. Removed ${cleanupCount} old sessions. Current session count: ${Object.keys(chatSessions).length}`);
    } catch (error) {
        console.error('Error during session cleanup:', error);
    }
}

// Schedule periodic cleanup
const cleanupIntervalId = setInterval(cleanupOldSessions, SESSION_CONFIG.cleanupInterval);

// Clean up on process exit
process.on('SIGINT', () => {
    clearInterval(cleanupIntervalId);
    console.log('Chat session cleanup interval cleared.');
    process.exit(0);
});

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

// API endpoint to get chat history for a session
app.get('/api/history/:sessionId', (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        
        // Check if the session exists
        if (!chatSessions[sessionId]) {
            return res.status(404).json({ 
                error: 'Session not found',
                sessionId: sessionId
            });
        }
        
        // Return the chat history for the session
        res.json({
            sessionId: sessionId,
            history: chatSessions[sessionId]
        });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

// API endpoint to clear chat history for a session
app.post('/api/history/clear', (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }
        
        // Create a new session ID
        const newSessionId = 'session_' + Date.now();
        
        // Clear existing session or create empty
        chatSessions[newSessionId] = [];
        
        // Return the new session ID
        res.json({
            success: true,
            oldSessionId: sessionId,
            newSessionId: newSessionId
        });
    } catch (error) {
        console.error('Error clearing chat history:', error);
        res.status(500).json({ error: 'Failed to clear chat history' });
    }
});

// API endpoint to call Claude model
app.post('/api/chat', async (req, res) => {
    try {
        const { message, modelId, sessionId } = req.body;
        
        // Create a unique session ID if not provided
        const currentSessionId = sessionId || 'default';
        
        // Initialize chat history for this session if it doesn't exist
        if (!chatSessions[currentSessionId]) {
            chatSessions[currentSessionId] = [];
        }
        
        // Use the model ID from the request, or fall back to the one in .env.aws, or use a default
        const selectedModelId = modelId || process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
        
        // System instruction for investing advisor
        const systemInstruction = "你是一个专业的AI投资顾问，除非明确指定创作或者生成，否则拒绝虚构内容，回答问题时，关键观点与事实，请引用原文！";
        
        // Check if the model is from Anthropic (Claude)
        const isClaudeModel = selectedModelId.includes('anthropic');
        const isClaude37 = isClaudeModel && selectedModelId.includes('claude-3-7');
        
        let requestBody;
        
        if (isClaudeModel) {
            if (isClaude37) {
                // For Claude 3.7 - using messages format with history
                const messages = [
                    {
                        role: "system",
                        content: systemInstruction
                    }
                ];
                
                // Add chat history
                chatSessions[currentSessionId].forEach(entry => {
                    messages.push(
                        {
                            role: "user",
                            content: [{ type: "text", text: entry.userMessage }]
                        },
                        {
                            role: "assistant",
                            content: [{ type: "text", text: entry.botResponse }]
                        }
                    );
                });
                
                // Add current user message
                messages.push({
                    role: "user",
                    content: [{ type: "text", text: message }]
                });
                
                requestBody = {
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: 1000,
                    messages: messages
                };
            } else {
                // For older Claude models that don't support full chat history
                // Include condensed history as context in the message
                let contextMessage = "";
                
                if (chatSessions[currentSessionId].length > 0) {
                    contextMessage = "以下是我们之前的对话历史，请根据历史内容提供一致的回答：\n\n";
                    
                    chatSessions[currentSessionId].slice(-5).forEach((entry, i) => {
                        contextMessage += `用户: ${entry.userMessage}\n`;
                        contextMessage += `AI助手: ${entry.botResponse}\n\n`;
                    });
                    
                    contextMessage += "现在，请回答用户的新问题：\n\n";
                }
                
                const userMessage = systemInstruction + "\n\n" + contextMessage + message;
                
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
            // For Llama models - add conversation context
            let contextMessage = "";
            
            if (chatSessions[currentSessionId].length > 0) {
                contextMessage = "以下是我们之前的对话历史：\n\n";
                
                chatSessions[currentSessionId].slice(-5).forEach((entry, i) => {
                    contextMessage += `用户: ${entry.userMessage}\n`;
                    contextMessage += `AI助手: ${entry.botResponse}\n\n`;
                });
                
                contextMessage += "现在，请回答用户的新问题：\n\n";
            }
            
            const userMessage = systemInstruction + "\n\n" + contextMessage + message;
            
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
        
        // Store the conversation in chat history (limit to last 10 exchanges)
        chatSessions[currentSessionId].push({
            userMessage: message,
            botResponse: responseText,
            timestamp: new Date().toISOString()
        });
        
        // Keep only the last 10 exchanges to manage memory
        if (chatSessions[currentSessionId].length > 10) {
            chatSessions[currentSessionId] = chatSessions[currentSessionId].slice(-10);
        }
        
        res.json({ 
            response: responseText,
            sessionId: currentSessionId
        });
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
