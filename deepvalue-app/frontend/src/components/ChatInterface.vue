<template>
  <div class="chat-interface">
    <div class="chat-messages" ref="chatMessages">
      <div v-for="message in chatHistory" 
           :key="message.timestamp" 
           :class="['message', message.role]">
        <div class="message-content">
          <div v-if="message.role === 'assistant'" class="markdown-content" v-html="renderMarkdown(message.content)"></div>
          <div v-else>{{ message.content }}</div>
        </div>
        <div class="message-actions" v-if="message.role === 'assistant'">
          <button @click="saveToNotes(message)" class="save-btn">
            Save to Notes
          </button>
        </div>
        <div class="message-timestamp">
          {{ formatTimestamp(message.timestamp) }}
        </div>
      </div>
    </div>

    <div class="chat-input">
      <textarea 
        v-model="currentMessage" 
        @keydown.enter.prevent="sendMessage"
        placeholder="Ask about market trends, company analysis, or investment strategies..."
        rows="3"
      ></textarea>
      <button @click="sendMessage" :disabled="!currentMessage.trim()">
        Send
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useStore } from 'vuex'
import { marked } from 'marked'

export default {
  name: 'ChatInterface',
  setup() {
    const store = useStore()
    const currentMessage = ref('')
    const chatMessages = ref(null)

    const chatHistory = computed(() => store.getters.getChatHistory)

    const scrollToBottom = async () => {
      await nextTick()
      if (chatMessages.value) {
        chatMessages.value.scrollTop = chatMessages.value.scrollHeight
      }
    }

    watch(chatHistory, () => {
      scrollToBottom()
    })

    const sendMessage = async () => {
      if (!currentMessage.value.trim()) return

      const message = currentMessage.value
      currentMessage.value = ''
      
      await store.dispatch('sendChatMessage', message)
    }

    const saveToNotes = (message) => {
      store.dispatch('saveChatToNotes', message.content)
    }

    const renderMarkdown = (content) => {
      return marked(content)
    }

    const formatTimestamp = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString()
    }

    onMounted(() => {
      scrollToBottom()
    })

    return {
      currentMessage,
      chatHistory,
      chatMessages,
      sendMessage,
      saveToNotes,
      renderMarkdown,
      formatTimestamp
    }
  }
}
</script>

<style scoped>
.chat-interface {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message {
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 8px;
  max-width: 80%;
}

.message.user {
  background-color: #e9ecef;
  margin-left: auto;
}

.message.assistant {
  background-color: #f8f9fa;
  margin-right: auto;
}

.message.system {
  background-color: #fff3cd;
  margin: 0 auto;
  text-align: center;
}

.message-content {
  margin-bottom: 0.5rem;
}

.message-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.save-btn {
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 0.8rem;
}

.message-timestamp {
  font-size: 0.8rem;
  color: #6c757d;
  text-align: right;
}

.chat-input {
  padding: 1rem;
  border-top: 1px solid #e9ecef;
}

textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  margin-bottom: 0.5rem;
}

button {
  float: right;
  padding: 0.5rem 1rem;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.markdown-content :deep(p) {
  margin: 0.5rem 0;
}

.markdown-content :deep(code) {
  background-color: #f1f1f1;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
}

.markdown-content :deep(pre) {
  background-color: #f1f1f1;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}
</style>
