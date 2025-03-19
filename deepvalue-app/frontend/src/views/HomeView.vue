<template>
  <div class="home-container">
    <!-- Left Sidebar - Watchlist -->
    <aside class="watchlist-sidebar">
      <WatchlistPanel />
    </aside>

    <!-- Main Content Area -->
    <main class="main-content">
      <!-- Top News Section -->
      <section class="news-section">
        <NewsPanel />
      </section>

      <!-- Central Chat Interface -->
      <section class="chat-section">
        <ChatInterface />
      </section>
    </main>

    <!-- Right Sidebar - Notes -->
    <aside class="notes-sidebar">
      <NotesPanel />
    </aside>
  </div>
</template>

<script>
import WatchlistPanel from '@/components/WatchlistPanel.vue'
import NewsPanel from '@/components/NewsPanel.vue'
import ChatInterface from '@/components/ChatInterface.vue'
import NotesPanel from '@/components/NotesPanel.vue'

export default {
  name: 'HomeView',
  components: {
    WatchlistPanel,
    NewsPanel,
    ChatInterface,
    NotesPanel
  }
}
</script>

<style scoped>
.home-container {
  display: grid;
  grid-template-columns: 250px 1fr 300px;
  height: 100%;
  overflow: hidden;
}

.watchlist-sidebar {
  background-color: #f8f9fa;
  border-right: 1px solid #e9ecef;
  overflow-y: auto;
}

.main-content {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.news-section {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
}

.chat-section {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.notes-sidebar {
  background-color: #f8f9fa;
  border-left: 1px solid #e9ecef;
  overflow-y: auto;
}
</style>
