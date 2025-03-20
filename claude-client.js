import { BedrockRuntime } from '@aws-sdk/client-bedrock-runtime';

export class ClaudeClient {
    constructor() {
        // Create Bedrock Runtime client
        this.bedrockRuntime = new BedrockRuntime({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
    }
    
    /**
     * Send a message to Claude and get a response
     */
    async sendMessage({ modelId, messages, enableReasoning = false }) {
        try {
            // Format messages for Claude
            const formattedMessages = messages.map(msg => ({
                role: msg.role,
                content: [{ type: 'text', text: msg.content }]
            }));
            
            // Create request parameters
            const params = {
                modelId: modelId,
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify({
                    anthropic_version: 'bedrock-2023-05-31',
                    max_tokens: 4096,
                    messages: formattedMessages,
                    temperature: 0.7,
                    top_p: 0.9,
                    system: enableReasoning ? 
                        "You are a helpful AI assistant specialized in investment analysis. When answering, follow this exact format: First, write 'Thinking Process:' and think step by step about the problem. Then, write 'Final Answer:' followed by your concise answer based on your reasoning. Never repeat your thinking in your final answer." :
                        "You are a helpful AI assistant specialized in investment analysis."
                })
            };
            
            // Call Claude API
            const response = await this.bedrockRuntime.invokeModel(params);
            
            // Parse response
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            
            // Extract content
            let responseText = '';
            let reasoningText = '';
            
            if (responseBody.content && responseBody.content.length > 0) {
                responseText = responseBody.content[0].text;
                
                // If reasoning is enabled, try to extract reasoning and response parts
                if (enableReasoning) {
                    const parts = this.extractReasoningAndResponse(responseText);
                    reasoningText = parts.reasoning;
                    responseText = parts.response;
                }
            }
            
            return {
                response: responseText,
                reasoning: reasoningText,
                usage: responseBody.usage
            };
        } catch (error) {
            console.error('Error calling Claude API:', error);
            throw error;
        }
    }
    
    /**
     * Stream a message to Claude and get a response in chunks
     */
    async streamMessage({ modelId, messages, enableReasoning = false, onThinking, onContent, onComplete, onError }) {
        try {
            // Format messages for Claude
            const formattedMessages = messages.map(msg => ({
                role: msg.role,
                content: [{ type: 'text', text: msg.content }]
            }));
            
            // Create request parameters
            const params = {
                modelId: modelId,
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify({
                    anthropic_version: 'bedrock-2023-05-31',
                    max_tokens: 4096,
                    messages: formattedMessages,
                    temperature: 0.7,
                    top_p: 0.9,
                    system: enableReasoning ? 
                        "You are a helpful AI assistant specialized in investment analysis. When answering, follow this exact format: First, write 'Thinking Process:' and think step by step about the problem. Then, write 'Final Answer:' followed by your concise answer based on your reasoning. Never repeat your thinking in your final answer." :
                        "You are a helpful AI assistant specialized in investment analysis."
                })
            };
            
            // Call Claude API with streaming
            const response = await this.bedrockRuntime.invokeModelWithResponseStream(params);
            
            let fullResponse = '';
            let isThinking = enableReasoning;
            let thinkingText = '';
            let responseText = '';
            
            // Process each chunk
            for await (const chunk of response.body) {
                try {
                    // Parse chunk
                    const parsedChunk = JSON.parse(new TextDecoder().decode(chunk.chunk?.bytes));
                    
                    if (parsedChunk.type === 'content_block_delta' && 
                        parsedChunk.delta && 
                        parsedChunk.delta.type === 'text_delta') {
                        
                        const textChunk = parsedChunk.delta.text;
                        fullResponse += textChunk;
                        
                        // If reasoning is enabled, try to determine if we're in thinking or response mode
                        if (enableReasoning) {
                            if (isThinking) {
                                // Check if we've reached the end of thinking section
                                if (fullResponse.includes('Final Answer:') || 
                                    fullResponse.includes('Final Response:') ||
                                    fullResponse.includes('My answer:') ||
                                    fullResponse.includes('My response:')) {
                                    isThinking = false;
                                    
                                    // Extract thinking part
                                    const parts = this.extractReasoningAndResponse(fullResponse);
                                    thinkingText = parts.reasoning;
                                    responseText = parts.response;
                                    
                                    // Clear previous thinking content and send only the clean reasoning part
                                    if (onThinking) onThinking(parts.reasoning);
                                    
                                    // Send initial response chunk
                                    if (onContent) onContent(responseText);
                                } else {
                                    // Still in thinking mode
                                    // Send only the chunk, not the accumulated thinking text
                                    // This prevents duplication when the server processes the chunks
                                    if (onThinking) onThinking(textChunk);
                                }
                            } else {
                                // In response mode
                                responseText += textChunk;
                                if (onContent) onContent(textChunk);
                            }
                        } else {
                            // No reasoning, just send content
                            if (onContent) onContent(textChunk);
                        }
                    }
                } catch (error) {
                    console.error('Error processing chunk:', error);
                    if (onError) onError(error);
                }
            }
            
            // If we're still in thinking mode at the end, try to extract reasoning and response
            if (enableReasoning && isThinking) {
                const parts = this.extractReasoningAndResponse(fullResponse);
                if (parts.reasoning && parts.response) {
                    // Clear previous thinking content and send only the clean reasoning part
                    if (onThinking) onThinking(parts.reasoning);
                    
                    // Send final response (this will overwrite any previous content)
                    if (onContent) onContent(parts.response);
                    
                    // Update full response - only keep the final answer
                    fullResponse = parts.response;
                }
            }
            
            // Call complete callback
            if (onComplete) onComplete(fullResponse);
            
        } catch (error) {
            console.error('Error setting up streaming:', error);
            if (onError) onError(error);
        }
    }
    
    /**
     * Extract reasoning and response parts from Claude's output
     */
    extractReasoningAndResponse(text) {
        // Check for markdown heading format for Thinking Process
        const thinkingHeaderMatch = text.match(/^#+\s*Thinking Process/im);
        if (thinkingHeaderMatch) {
            // Find the next heading or the end of the text
            const startIdx = thinkingHeaderMatch.index + thinkingHeaderMatch[0].length;
            const nextHeadingMatch = text.substring(startIdx).match(/^#+\s/m);
            
            let endIdx;
            if (nextHeadingMatch) {
                endIdx = startIdx + nextHeadingMatch.index;
                // Extract the reasoning and the rest as response
                return {
                    reasoning: text.substring(startIdx, endIdx).trim(),
                    response: text.substring(endIdx).trim()
                };
            }
        }
        
        // Common patterns for separating reasoning from response
        const separators = [
            'Final Answer:', 'Final Response:', 'My answer:', 'My response:',
            'Answer:', 'Response:', 'In conclusion:', 'To summarize:',
            '---', '###'
        ];
        
        // Try to find a separator
        for (const separator of separators) {
            const index = text.indexOf(separator);
            if (index !== -1) {
                return {
                    reasoning: text.substring(0, index).trim(),
                    response: text.substring(index + separator.length).trim()
                };
            }
        }
        
        // If no separator found, try to split by double newline
        const parts = text.split('\n\n');
        if (parts.length >= 2) {
            // Assume first half is reasoning, second half is response
            const midpoint = Math.floor(parts.length / 2);
            return {
                reasoning: parts.slice(0, midpoint).join('\n\n').trim(),
                response: parts.slice(midpoint).join('\n\n').trim()
            };
        }
        
        // If all else fails, return the whole text as response
        return {
            reasoning: '',
            response: text.trim()
        };
    }
}
