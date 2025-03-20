document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const clearButton = document.getElementById('clearButton');
    
    // Using Claude 3.7 model directly
    const modelId = 'anthropic.claude-3-7-sonnet-20250219-v1:0';
    
    // Session management
    let currentSessionId = null;
    
    // Check for existing session ID in local storage
    if (localStorage.getItem('chatSessionId')) {
        currentSessionId = localStorage.getItem('chatSessionId');
        console.log('Restored session ID:', currentSessionId);
    } else {
        // Generate a new session ID if none exists
        currentSessionId = 'session_' + Date.now();
        localStorage.setItem('chatSessionId', currentSessionId);
        console.log('Created new session ID:', currentSessionId);
    }
    
    // Load chat history from DynamoDB first, then fallback to local storage
    async function loadChatHistory() {
        try {
            // First try to fetch messages from DynamoDB via API
            const response = await fetch(`/api/history?sessionId=${currentSessionId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Clear existing messages
                chatMessages.innerHTML = '';
                
                // Add each message to the UI
                if (data.messages && data.messages.length > 0) {
                    data.messages.forEach(msg => {
                        addMessage(msg.content, msg.role, false);
                    });
                    
                    // Update local storage with the latest from DynamoDB
                    saveChatHistory();
                    
                    console.log('Loaded', data.messages.length, 'messages from DynamoDB');
                } else {
                    // If no messages in DynamoDB, try local storage as fallback
                    loadFromLocalStorage();
                }
            } else {
                // If API call fails, fall back to local storage
                loadFromLocalStorage();
            }
        } catch (error) {
            console.error('Error fetching chat history from server:', error);
            // Fall back to local storage
            loadFromLocalStorage();
        }
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Helper function to load from local storage
    function loadFromLocalStorage() {
        const storedMessages = localStorage.getItem('chatMessages_' + currentSessionId);
        if (storedMessages) {
            try {
                const messages = JSON.parse(storedMessages);
                
                // Clear existing messages
                chatMessages.innerHTML = '';
                
                // Add each message to the UI
                messages.forEach(msg => {
                    addMessage(msg.text, msg.sender, false);
                });
                
                console.log('Loaded', messages.length, 'messages from local storage');
            } catch (e) {
                console.error('Failed to parse chat history:', e);
            }
        }
    }
    
    // Save chat history to local storage
    function saveChatHistory() {
        const messages = [];
        
        // Get all message elements
        const messageElements = chatMessages.querySelectorAll('.message');
        
        // Extract text and sender type from each
        messageElements.forEach(el => {
            const isBotMessage = el.classList.contains('bot-message');
            messages.push({
                text: isBotMessage ? el.innerHTML : el.textContent,
                sender: isBotMessage ? 'bot' : 'user'
            });
        });
        
        // Save to local storage
        localStorage.setItem('chatMessages_' + currentSessionId, JSON.stringify(messages));
    }
    
    // Load chat history from DynamoDB and then local storage as fallback
    loadChatHistory().catch(err => {
        console.error('Error loading chat history:', err);
        // If async loading fails, try local storage as fallback
        loadFromLocalStorage();
    });
    
    // 发送消息函数
    async function sendMessage() {
        const userMessage = userInput.value.trim();
        if (!userMessage) return;
        
        // 检查是否启用推理功能
        const enableReasoning = document.getElementById('enable-reasoning')?.checked || false;
        
        // 检查是否启用流式响应
        const useStreaming = document.getElementById('enable-streaming')?.checked || true;
        
        // 清空输入框
        userInput.value = '';
        
        // 添加用户消息到聊天界面
        addMessage(userMessage, 'user');
        
        // 显示加载状态
        sendButton.disabled = true;
        sendButton.innerHTML = '<span class="loading-indicator"></span>';
        
        try {
            if (useStreaming) {
                // 使用流式响应处理Claude 3.7
                await handleStreamingResponse(userMessage, modelId, enableReasoning);
            } else {
                // 调用后端API（非流式）
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        message: userMessage,
                        modelId: modelId,
                        sessionId: currentSessionId,
                        enableReasoning: enableReasoning
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                
                const data = await response.json();
                
                // Update session ID if server provides a new one
                if (data.sessionId && data.sessionId !== currentSessionId) {
                    currentSessionId = data.sessionId;
                }
                
                // 处理响应
                let responseContent = data.response;
                
                // 如果有推理内容，添加到响应中
                if (data.reasoning) {
                    const parsedReasoning = marked.parse(data.reasoning);
                    const parsedResponse = marked.parse(data.response);
                    responseContent = `<div class="reasoning-block"><strong>思考过程:</strong><br>${parsedReasoning}</div><div class="response-block">${parsedResponse}</div>`;
                    addMessage(responseContent, 'assistant', true);
                } else {
                    addMessage(responseContent, 'assistant');
                }
            }
        } catch (error) {
            console.error('Error calling API:', error);
            addMessage('抱歉，我遇到了一些问题。请稍后再试。', 'bot');
        } finally {
            // 恢复发送按钮状态
            sendButton.disabled = false;
            sendButton.textContent = '发送';
        }
    }
    
    // 处理Claude 3.7的流式响应
    async function handleStreamingResponse(userMessage, modelId, enableReasoning) {
        // 创建消息容器
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message bot-message'; // Fixed class name to 'bot-message'
        
        // 创建思考内容容器（用于推理）
        const thinkingContainer = document.createElement('div');
        thinkingContainer.className = 'reasoning-block';
        thinkingContainer.style.display = 'none';
        
        // 创建响应内容容器
        const responseContainer = document.createElement('div');
        responseContainer.className = 'response-block';
        
        // 将容器添加到消息中
        messageContainer.appendChild(thinkingContainer);
        messageContainer.appendChild(responseContainer);
        
        // 添加到聊天界面
        chatMessages.appendChild(messageContainer);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // 连接到SSE端点
        const eventSource = new EventSource(`/api/chat?sessionId=${currentSessionId}&modelId=${modelId}&message=${encodeURIComponent(userMessage)}&enableReasoning=${enableReasoning}&stream=true`);
        
        let hasThinking = false;
        let responseText = '';
        let thinkingText = '';
        
        // 处理传入的事件
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            // 处理会话ID更新
            if (data.type === 'session' && data.sessionId) {
                currentSessionId = data.sessionId;
            }
            
            // 处理思考/推理内容
            if (data.type === 'thinking') {
                if (!hasThinking) {
                    hasThinking = true;
                    thinkingContainer.style.display = 'block';
                    thinkingContainer.innerHTML = '<strong>思考过程:</strong><br>';
                }
                
                // Remove all variations of "Thinking Process:" headers
                let cleanedContent = data.content
                    .replace(/^Thinking Process:?\s*/i, '')
                    .replace(/^FinalThinking Process:?\s*/i, '')
                    .replace(/^## Thinking Process\s*/i, '')
                    .replace(/^# Thinking Process\s*/i, '');
                
                if (cleanedContent.trim().length > 0) {
                    // Don't accumulate thinking text on the client side
                    // Just display what the server sends
                    thinkingContainer.innerHTML = `<strong>思考过程:</strong><br>${marked.parse(cleanedContent)}`;
                }
            }
            
            // 处理常规内容 - 仅在响应容器中显示
            if (data.type === 'content') {
                // Completely remove any thinking process text and duplicate content
                const contentWithoutThinking = data.content.replace(/Thinking Process[\s\S]*?(Final Answer:|Final Response:|My answer:|My response:|Answer:|Response:|In conclusion:|To summarize:)/i, '');
                
                // Also remove the marker itself
                const cleanContent = contentWithoutThinking.replace(/(Final Answer:|Final Response:|My answer:|My response:|Answer:|Response:|In conclusion:|To summarize:)/i, '');
                
                // Don't add duplicated content
                if (!responseText.includes(cleanContent.trim()) && cleanContent.trim().length > 0) {
                    responseText += cleanContent;
                    responseContainer.innerHTML = marked.parse(responseText);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }
            
            // 处理完成
            if (data.type === 'done') {
                eventSource.close();
            }
            
            // 处理错误
            if (data.type === 'error') {
                eventSource.close();
                responseContainer.innerHTML = `<div class="error">错误: ${data.error}</div>`;
            }
        };
        
        // 处理连接错误
        eventSource.onerror = () => {
            eventSource.close();
            if (!responseText) {
                responseContainer.innerHTML = '<div class="error">连接错误，请重试</div>';
            }
        };
    }
    
    // 添加消息到聊天界面
    function addMessage(text, sender, saveHistory = true) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        
        // Map DynamoDB role names to UI class names
        if (sender === 'user') {
            messageDiv.classList.add('user-message');
        } else if (sender === 'bot' || sender === 'assistant') {
            messageDiv.classList.add('bot-message');
        }
        
        // 对于机器人消息，使用marked渲染markdown
        if (sender === 'bot' || sender === 'assistant') {
            messageDiv.innerHTML = marked.parse(text);
        } else {
            messageDiv.textContent = text;
        }
        
        chatMessages.appendChild(messageDiv);
        
        // 滚动到最新消息
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Save chat history
        if (saveHistory) {
            saveChatHistory();
        }
    }
    
    // Add clear chat history functionality
    async function clearChatHistory() {
        try {
            // Call API to clear chat history
            const response = await fetch('/api/history/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    sessionId: currentSessionId 
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to clear chat history');
            }
            
            const data = await response.json();
            
            // Keep using the same session ID (no need to update)
            console.log('Chat history cleared for session:', currentSessionId);
            
            // Clear UI
            chatMessages.innerHTML = '';
            
            // Add welcome message
            addMessage('您好！我是您的投资AI助手。我可以帮您分析股票、解答投资问题或提供市场见解。请告诉我您想了解什么？', 'bot');
            
            // Clear local storage for current session
            localStorage.removeItem('chatMessages_' + currentSessionId);
        } catch (error) {
            console.error('Error clearing chat history:', error);
            
            // Fallback to client-side clearing if server fails
            chatMessages.innerHTML = '';
            addMessage('您好！我是您的投资AI助手。我可以帮您分析股票、解答投资问题或提供市场见解。请告诉我您想了解什么？', 'bot');
            
            // Clear local storage for current session
            localStorage.removeItem('chatMessages_' + currentSessionId);
        }
    }
    
    // 事件监听器
    sendButton.addEventListener('click', sendMessage);
    clearButton.addEventListener('click', clearChatHistory);
    
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
