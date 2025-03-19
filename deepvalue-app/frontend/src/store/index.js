import { createStore } from 'vuex'
import axios from 'axios'

export default createStore({
  state: {
    watchlist: [],
    currentCompany: null,
    news: [],
    notes: [],
    chatHistory: []
  },
  getters: {
    getWatchlist: state => state.watchlist,
    getCurrentCompany: state => state.currentCompany,
    getNews: state => state.news,
    getNotes: state => state.notes,
    getChatHistory: state => state.chatHistory
  },
  mutations: {
    SET_WATCHLIST(state, companies) {
      state.watchlist = companies;
    },
    ADD_TO_WATCHLIST(state, company) {
      state.watchlist.push(company);
    },
    REMOVE_FROM_WATCHLIST(state, symbol) {
      state.watchlist = state.watchlist.filter(company => company.symbol !== symbol);
    },
    SET_CURRENT_COMPANY(state, company) {
      state.currentCompany = company;
    },
    SET_NEWS(state, news) {
      state.news = news;
    },
    ADD_NOTE(state, note) {
      state.notes.push(note);
    },
    UPDATE_NOTE(state, { id, content }) {
      const noteIndex = state.notes.findIndex(note => note.id === id);
      if (noteIndex !== -1) {
        state.notes[noteIndex].content = content;
      }
    },
    DELETE_NOTE(state, id) {
      state.notes = state.notes.filter(note => note.id !== id);
    },
    ADD_CHAT_MESSAGE(state, message) {
      state.chatHistory.push(message);
    },
    SAVE_CHAT_TO_NOTES(state, chatContent) {
      const newNote = {
        id: Date.now(),
        title: `Chat Note - ${new Date().toLocaleDateString()}`,
        content: chatContent,
        tags: ['chat'],
        createdAt: new Date().toISOString()
      };
      state.notes.push(newNote);
    }
  },
  actions: {
    async fetchWatchlist({ commit }) {
      try {
        const response = await axios.get('/api/watchlist');
        commit('SET_WATCHLIST', response.data);
      } catch (error) {
        console.error('Error fetching watchlist:', error);
      }
    },
    async addToWatchlist({ commit }, company) {
      try {
        await axios.post('/api/watchlist', company);
        commit('ADD_TO_WATCHLIST', company);
      } catch (error) {
        console.error('Error adding to watchlist:', error);
      }
    },
    async removeFromWatchlist({ commit }, symbol) {
      try {
        await axios.delete(`/api/watchlist/${symbol}`);
        commit('REMOVE_FROM_WATCHLIST', symbol);
      } catch (error) {
        console.error('Error removing from watchlist:', error);
      }
    },
    async fetchCompanyDetails({ commit }, symbol) {
      try {
        const response = await axios.get(`/api/company/${symbol}`);
        commit('SET_CURRENT_COMPANY', response.data);
      } catch (error) {
        console.error('Error fetching company details:', error);
      }
    },
    async fetchNews({ commit }, filters = {}) {
      try {
        const response = await axios.get('/api/news', { params: filters });
        commit('SET_NEWS', response.data);
      } catch (error) {
        console.error('Error fetching news:', error);
      }
    },
    async sendChatMessage({ commit }, message) {
      try {
        commit('ADD_CHAT_MESSAGE', { role: 'user', content: message, timestamp: new Date().toISOString() });
        const response = await axios.post('/api/chat', { message });
        commit('ADD_CHAT_MESSAGE', { 
          role: 'assistant', 
          content: response.data.response, 
          timestamp: new Date().toISOString() 
        });
        return response.data;
      } catch (error) {
        console.error('Error sending chat message:', error);
        commit('ADD_CHAT_MESSAGE', { 
          role: 'system', 
          content: 'Sorry, there was an error processing your request.', 
          timestamp: new Date().toISOString() 
        });
      }
    },
    saveChatToNotes({ commit }, chatContent) {
      commit('SAVE_CHAT_TO_NOTES', chatContent);
    }
  }
})
