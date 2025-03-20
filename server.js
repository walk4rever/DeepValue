import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ClaudeClient } from './claude-client.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.aws file
dotenv.config({ path: '.env.aws' });

const app = express();
const port = process.env.PORT || 3000;

// Create Claude client
const claudeClient = new ClaudeClient();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Store chat sessions
const chatSessions = {};

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId, enableReasoning } = req.body;
        
        // Always use Claude 3.7
        const modelId = 'anthropic.claude-3-7-sonnet-20250219-v1:0';
        
        // Get or create session
        let session = chatSessions[sessionId];
        if (!session) {
            session = {
                id: sessionId,
                messages: []
            };
            chatSessions[sessionId] = session;
        }
        
        // Add user message to session
        session.messages.push({
            role: 'user',
            content: message
        });
        
        // Get response from Claude
        const claudeResponse = await claudeClient.sendMessage({
            modelId,
            messages: session.messages,
            enableReasoning
        });
        
        // Add assistant response to session
        session.messages.push({
            role: 'assistant',
            content: claudeResponse.response
        });
        
        // Send response to client
        res.json({
            response: claudeResponse.response,
            reasoning: claudeResponse.reasoning,
            sessionId: session.id
        });
    } catch (error) {
        console.error('Error in chat API:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint for streaming chat
app.get('/api/chat', (req, res) => {
    try {
        const { message, sessionId, enableReasoning } = req.query;
        const modelId = 'us.anthropic.claude-3-7-sonnet-20250219-v1:0';
        
        // Set up SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Get or create session
        let session = chatSessions[sessionId];
        if (!session) {
            session = {
                id: sessionId,
                messages: []
            };
            chatSessions[sessionId] = session;
            
            // Send session ID to client
            res.write(`data: ${JSON.stringify({ type: 'session', sessionId: session.id })}\n\n`);
        }
        
        // Add user message to session
        session.messages.push({
            role: 'user',
            content: message
        });
        
        // Stream response from Claude
        claudeClient.streamMessage({
            modelId,
            messages: session.messages,
            enableReasoning,
            onThinking: (chunk) => {
                res.write(`data: ${JSON.stringify({ type: 'thinking', content: chunk })}\n\n`);
            },
            onContent: (chunk) => {
                res.write(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`);
            },
            onComplete: (fullResponse) => {
                // Add assistant response to session
                session.messages.push({
                    role: 'assistant',
                    content: fullResponse
                });
                
                // Send done event
                res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                res.end();
            },
            onError: (error) => {
                console.error('Streaming error:', error);
                res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
                res.end();
            }
        });
    } catch (error) {
        console.error('Error in streaming chat API:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
    }
});

// API endpoint to clear chat history
app.post('/api/history/clear', (req, res) => {
    try {
        const { sessionId } = req.body;
        
        // Delete the session
        const oldSessionId = sessionId;
        delete chatSessions[oldSessionId];
        
        // Create a new session
        const newSessionId = 'session_' + Date.now();
        chatSessions[newSessionId] = {
            id: newSessionId,
            messages: []
        };
        
        res.json({
            success: true,
            oldSessionId,
            newSessionId
        });
    } catch (error) {
        console.error('Error clearing chat history:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
