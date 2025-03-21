// Global variables
let currentSessionId = null;
let eventSource = null;
let isProcessing = false;

// DOM elements
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const chatMessages = document.getElementById('chat-messages');
const sendButton = document.getElementById('send-button');
const clearButton = document.getElementById('clear-button');
const reasoningToggle = document.getElementById('reasoning-toggle');

// Initialize the chat
function initChat() {
    // Get session ID from localStorage if available
    currentSessionId = localStorage.getItem('sessionId');
    
    // Load chat history if session ID exists
    if (currentSessionId) {
        loadChatHistory();
    }
    
    // Set up event listeners
    chatForm.addEventListener('submit', handleSubmit);
    clearButton.addEventListener('click', clearChat);
    
    // Focus on input field
    messageInput.focus();
}

// Load chat history from server
async function loadChatHistory() {
    try {
        const response = await fetch(`/api/history?sessionId=${currentSessionId}`);
        const data = await response.json();
        
        if (data.success && data.messages && data.messages.length > 0) {
            // Clear existing messages
            chatMessages.innerHTML = '';
            
            // Add each message to the chat
            data.messages.forEach(msg => {
                const messageElement = createMessageElement(msg.role, msg.content);
                chatMessages.appendChild(messageElement);
            });
            
            // Scroll to bottom
            scrollToBottom();
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        showError('Failed to load chat history. Please try again.');
    }
}

// Handle form submission
async function handleSubmit(event) {
    event.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message || isProcessing) return;
    
    // Set processing state
    isProcessing = true;
    sendButton.disabled = true;
    
    // Add user message to chat
    const userMessageElement = createMessageElement('user', message);
    chatMessages.appendChild(userMessageElement);
    
    // Clear input field
    messageInput.value = '';
    
    // Create assistant message placeholder
    const assistantMessageElement = createMessageElement('assistant', '');
    const assistantMessageContent = assistantMessageElement.querySelector('.message-content');
    chatMessages.appendChild(assistantMessageElement);
    
    // Add thinking indicator
    const thinkingElement = document.createElement('div');
    thinkingElement.className = 'thinking-indicator';
    thinkingElement.innerHTML = '<span>思考中</span><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';
    assistantMessageContent.appendChild(thinkingElement);
    
    // Scroll to bottom
    scrollToBottom();
    
    // Get reasoning toggle state
    const enableReasoning = reasoningToggle && reasoningToggle.checked;
    
    // Close any existing event source
    if (eventSource) {
        eventSource.close();
    }
    
    // Create new event source for streaming response
    const url = `/api/chat?message=${encodeURIComponent(message)}&sessionId=${currentSessionId || ''}&enableReasoning=${enableReasoning}`;
    eventSource = new EventSource(url);
    
    let responseText = '';
    let thinkingText = '';
    let isThinking = enableReasoning;
    
    // Handle server-sent events
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        if (data.type === 'session' && data.sessionId) {
            // Save session ID
            currentSessionId = data.sessionId;
            localStorage.setItem('sessionId', currentSessionId);
        } else if (data.type === 'thinking') {
            // Update thinking content
            if (!thinkingElement.parentNode) {
                assistantMessageContent.appendChild(thinkingElement);
            }
            
            thinkingText += data.content;
            
            // Create or update reasoning element
            let reasoningElement = assistantMessageElement.querySelector('.reasoning-content');
            if (!reasoningElement) {
                reasoningElement = document.createElement('div');
                reasoningElement.className = 'reasoning-content';
                assistantMessageElement.insertBefore(reasoningElement, assistantMessageContent);
            }
            
            // Update reasoning content with markdown
            reasoningElement.innerHTML = marked.parse(thinkingText);
            
            // Scroll to keep the latest content visible
            scrollToBottom();
        } else if (data.type === 'content') {
            // Remove thinking indicator if present
            if (thinkingElement.parentNode) {
                thinkingElement.remove();
            }
            
            // Update response text
            responseText += data.content;
            
            // Update message content with markdown
            assistantMessageContent.innerHTML = marked.parse(responseText);
            
            // Scroll to keep the latest content visible
            scrollToBottom();
        } else if (data.type === 'done') {
            // Remove thinking indicator if present
            if (thinkingElement.parentNode) {
                thinkingElement.remove();
            }
            
            // Close event source
            eventSource.close();
            eventSource = null;
            
            // Reset processing state
            isProcessing = false;
            sendButton.disabled = false;
            
            // Focus on input field
            messageInput.focus();
        } else if (data.type === 'error') {
            // Handle error
            console.error('Error from server:', data.error);
            
            // Remove thinking indicator
            if (thinkingElement.parentNode) {
                thinkingElement.remove();
            }
            
            // Show error message
            assistantMessageContent.innerHTML = '<div class="error-message">Sorry, an error occurred. Please try again.</div>';
            
            // Close event source
            eventSource.close();
            eventSource = null;
            
            // Reset processing state
            isProcessing = false;
            sendButton.disabled = false;
            
            // Focus on input field
            messageInput.focus();
        }
    };
    
    eventSource.onerror = function(error) {
        console.error('EventSource error:', error);
        
        // Remove thinking indicator
        if (thinkingElement.parentNode) {
            thinkingElement.remove();
        }
        
        // Show error message
        assistantMessageContent.innerHTML = '<div class="error-message">Connection error. Please try again.</div>';
        
        // Close event source
        eventSource.close();
        eventSource = null;
        
        // Reset processing state
        isProcessing = false;
        sendButton.disabled = false;
        
        // Focus on input field
        messageInput.focus();
    };
}

// Create a message element
function createMessageElement(role, content) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${role}-message`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (content) {
        messageContent.innerHTML = marked.parse(content);
    }
    
    messageElement.appendChild(messageContent);
    return messageElement;
}

// Clear chat history
async function clearChat() {
    if (!currentSessionId || isProcessing) return;
    
    try {
        const response = await fetch('/api/history/clear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionId: currentSessionId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear chat messages
            chatMessages.innerHTML = '';
            
            // Focus on input field
            messageInput.focus();
        } else {
            showError('Failed to clear chat history. Please try again.');
        }
    } catch (error) {
        console.error('Error clearing chat history:', error);
        showError('Failed to clear chat history. Please try again.');
    }
}

// Show error message
function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-toast';
    errorElement.textContent = message;
    
    document.body.appendChild(errorElement);
    
    // Remove error message after 5 seconds
    setTimeout(() => {
        errorElement.remove();
    }, 5000);
}

// Scroll to bottom of chat
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initChat);

// Handle preset questions
function askPresetQuestion(question) {
    if (isProcessing) return;
    
    // Set question in input field
    messageInput.value = question;
    
    // Submit the form
    chatForm.dispatchEvent(new Event('submit'));
}

// Handle tool selection
function selectTool(tool) {
    if (isProcessing) return;
    
    // Set tool prompt in input field
    messageInput.value = `请使用${tool}工具帮我分析`;
    
    // Focus on input field to let user complete the prompt
    messageInput.focus();
}
