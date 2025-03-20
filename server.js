import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ClaudeClient } from './claude-client.js';
import { ChatHistoryService } from './chat-history-service.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.aws file
dotenv.config({ path: '.env.aws' });

const app = express();
const port = process.env.PORT || 3000;

// Create Claude client
const claudeClient = new ClaudeClient();
// Create chat history service
const chatHistoryService = new ChatHistoryService();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId, enableReasoning } = req.body;
        
        // Always use Claude 3.7
        const modelId = 'anthropic.claude-3-7-sonnet-20250219-v1:0';
        
        // Get or create session
        let session = await chatHistoryService.getSession(sessionId);
        if (!session) {
            await chatHistoryService.createSession(sessionId);
        }
        
        // Get all messages for the session
        const storedMessages = await chatHistoryService.getMessages(sessionId);
        
        // Add user message
        await chatHistoryService.addMessage(sessionId, 'user', message);
        
        // Format messages for Claude
        const claudeMessages = storedMessages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        claudeMessages.push({ role: 'user', content: message });
        
        // Get response from Claude
        const claudeResponse = await claudeClient.sendMessage({
            modelId,
            messages: claudeMessages,
            enableReasoning
        });
        
        // Add assistant response
        await chatHistoryService.addMessage(sessionId, 'assistant', claudeResponse.response);
        
        // Send response to client
        res.json({
            response: claudeResponse.response,
            reasoning: claudeResponse.reasoning,
            sessionId: sessionId
        });
    } catch (error) {
        console.error('Error in chat API:', error);
        
        // Send a more user-friendly error message
        res.status(500).json({ 
            error: "An error occurred while processing your request. Please try again.",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// API endpoint for streaming chat
app.get('/api/chat', async (req, res) => {
    try {
        const { message, sessionId, enableReasoning } = req.query;
        const modelId = 'us.anthropic.claude-3-7-sonnet-20250219-v1:0';
        
        // Set up SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Get or create session
        let session = await chatHistoryService.getSession(sessionId);
        let currentSessionId = sessionId;
        
        if (!session) {
            currentSessionId = await chatHistoryService.createSession(sessionId || 'session_' + Date.now());
            
            // Send session ID to client
            res.write(`data: ${JSON.stringify({ type: 'session', sessionId: currentSessionId })}\n\n`);
        }
        
        // Get all messages for the session
        const storedMessages = await chatHistoryService.getMessages(currentSessionId);
        
        // Add user message
        await chatHistoryService.addMessage(currentSessionId, 'user', message);
        
        // Format messages for Claude
        const claudeMessages = storedMessages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        claudeMessages.push({ role: 'user', content: message });
        
        // Stream response from Claude
        let fullResponse = '';
        
        claudeClient.streamMessage({
            modelId,
            messages: claudeMessages,
            enableReasoning,
            onThinking: (chunk) => {
                res.write(`data: ${JSON.stringify({ type: 'thinking', content: chunk })}\n\n`);
            },
            onContent: (chunk) => {
                fullResponse += chunk;
                res.write(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`);
            },
            onComplete: async (completeResponse) => {
                try {
                    // Add assistant response to DynamoDB
                    await chatHistoryService.addMessage(currentSessionId, 'assistant', completeResponse || fullResponse);
                    
                    // Send done event
                    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                } catch (error) {
                    console.error('Error saving assistant response:', error);
                    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Error saving response' })}\n\n`);
                } finally {
                    res.end();
                }
            },
            onError: (error) => {
                console.error('Streaming error:', error);
                res.write(`data: ${JSON.stringify({ type: 'error', error: 'Error processing your request' })}\n\n`);
                res.end();
            }
        });
    } catch (error) {
        console.error('Error in streaming chat API:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'An error occurred while processing your request' })}\n\n`);
        res.end();
    }
});

// API endpoint to clear chat history
app.post('/api/history/clear', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: "Session ID is required" });
        }
        
        // Clear session and create a new one
        const newSessionId = await chatHistoryService.clearSession(sessionId);
        
        res.json({
            success: true,
            oldSessionId: sessionId,
            newSessionId
        });
    } catch (error) {
        console.error('Error clearing chat history:', error);
        res.status(500).json({ 
            error: "Failed to clear chat history. Please try again.",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
