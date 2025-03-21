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
    
    // Function to add a message to the chat
    function addMessage(text, sender, saveHistory = true) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender + '-message');
        
        if (sender === 'bot') {
            // Use marked.js to render markdown for bot messages
            messageDiv.innerHTML = marked.parse(text);
        } else {
            // Plain text for user messages
            messageDiv.textContent = text;
        }
        
        chatMessages.appendChild(messageDiv);
        
        // Scroll to the latest message
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Save chat history
        if (saveHistory) {
            saveChatHistory();
        }
    }
    
    // Load chat history from local storage
    function loadChatHistory() {
        const storedMessages = localStorage.getItem('chatMessages_' + currentSessionId);
        if (storedMessages) {
            try {
                const messages = JSON.parse(storedMessages);
                if (messages.length > 0) {
                    // Clear existing messages
                    chatMessages.innerHTML = '';
                    
                    // Add each message to the chat
                    messages.forEach(msg => {
                        addMessage(msg.text, msg.sender, false);
                    });
                    
                    // Scroll to the bottom
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    
                    console.log('Loaded', messages.length, 'messages from history');
                }
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
    
    // Load chat history when page loads
    loadChatHistory();
    
    // Function to send a message
    async function sendMessage() {
        const userMessage = userInput.value.trim();
        if (!userMessage) return;
        
        // Clear input field
        userInput.value = '';
        
        // Add user message to chat
        addMessage(userMessage, 'user');
        
        // Add temporary bot message with loading indicator
        const tempBotDiv = document.createElement('div');
        tempBotDiv.classList.add('message', 'bot-message');
        tempBotDiv.innerHTML = '<div class="thinking">思考中<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div>';
        chatMessages.appendChild(tempBotDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {
            // Set up SSE for streaming response
            const eventSource = new EventSource(`/api/chat?message=${encodeURIComponent(userMessage)}&sessionId=${currentSessionId}`);
            
            let fullResponse = '';
            
            eventSource.onmessage = function(event) {
                const data = JSON.parse(event.data);
                
                if (data.type === 'session' && data.sessionId) {
                    // Update session ID if provided
                    currentSessionId = data.sessionId;
                    localStorage.setItem('chatSessionId', currentSessionId);
                    console.log('Updated session ID:', currentSessionId);
                } else if (data.type === 'content') {
                    // Update bot message content
                    fullResponse += data.content;
                    tempBotDiv.innerHTML = marked.parse(fullResponse);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                } else if (data.type === 'done') {
                    // Save final message to local storage
                    saveChatHistory();
                    
                    // Close event source
                    eventSource.close();
                } else if (data.type === 'error') {
                    // Handle error
                    tempBotDiv.innerHTML = `
                        <div class="error">Error: ${data.error || 'Something went wrong. Please try again.'}</div>
                    `;
                    
                    // Close event source
                    eventSource.close();
                }
            };
            
            eventSource.onerror = function(error) {
                console.error('EventSource error:', error);
                
                // Update bot message with error
                tempBotDiv.innerHTML = `
                    <div class="error">Connection error. Please try again.</div>
                `;
                
                // Close event source
                eventSource.close();
            };
        } catch (error) {
            console.error('Error sending message:', error);
            
            // Update bot message with error
            tempBotDiv.innerHTML = `
                <div class="error">Error: ${error.message || 'Something went wrong. Please try again.'}</div>
            `;
        }
    }
    
    // Function to clear chat history
    async function clearChatHistory() {
        try {
            // Clear chat history in DynamoDB via API
            const response = await fetch('/api/history/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: currentSessionId
                })
            });
            
            if (response.ok) {
                console.log('Chat history cleared from DynamoDB');
                
                // Clear UI
                chatMessages.innerHTML = '';
                
                // Add welcome message
                addMessage('您好！我是您的投资AI助手。我可以帮您分析股票、解答投资问题或提供市场见解。请告诉我您想了解什么？', 'bot');
                
                // Clear local storage for this session
                localStorage.removeItem('chatMessages_' + currentSessionId);
            } else {
                console.error('Failed to clear chat history from DynamoDB');
                
                // Fallback to client-side clearing
                chatMessages.innerHTML = '';
                addMessage('您好！我是您的投资AI助手。我可以帮您分析股票、解答投资问题或提供市场见解。请告诉我您想了解什么？', 'bot');
                
                // Clear local storage for this session
                localStorage.removeItem('chatMessages_' + currentSessionId);
            }
        } catch (error) {
            console.error('Error clearing chat history:', error);
            
            // Fallback to client-side clearing
            chatMessages.innerHTML = '';
            addMessage('您好！我是您的投资AI助手。我可以帮您分析股票、解答投资问题或提供市场见解。请告诉我您想了解什么？', 'bot');
            
            // Clear local storage for this session
            localStorage.removeItem('chatMessages_' + currentSessionId);
        }
    }
    
    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    
    if (clearButton) {
        clearButton.addEventListener('click', clearChatHistory);
    }
    
    // Initialize with welcome message if chat is empty
    if (chatMessages.children.length === 0) {
        addMessage('您好！我是您的投资AI助手。我可以帮您分析股票、解答投资问题或提供市场见解。请告诉我您想了解什么？', 'bot');
    }
});
