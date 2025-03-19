<template>
  <div class="news-panel">
    <h2>Latest News</h2>
    <div class="news-filters">
      <div class="filter-group">
        <label>Filter by:</label>
        <select v-model="selectedFilter">
          <option value="all">All News</option>
          <option value="watchlist">My Watchlist</option>
          <option value="industry">By Industry</option>
        </select>
        <select v-if="selectedFilter === 'industry'" v-model="selectedIndustry">
          <option v-for="industry in industries" :key="industry" :value="industry">
            {{ industry }}
          </option>
        </select>
      </div>
    </div>

    <div class="news-list">
      <div v-for="article in filteredNews" :key="article.id" class="news-item">
        <div class="news-header">
          <span class="news-source">{{ article.source }}</span>
          <span class="news-date">{{ formatDate(article.publishedAt) }}</span>
        </div>
        <h3 class="news-title">{{ article.title }}</h3>
        <p class="news-summary">{{ article.summary }}</p>
        <div class="news-footer">
          <a :href="article.url" target="_blank" class="read-more">Read more</a>
          <div class="news-tags">
            <span v-for="tag in article.tags" :key="tag" class="news-tag">{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'

export default {
  name: 'NewsPanel',
  setup() {
    const store = useStore()
    const selectedFilter = ref('all')
    const selectedIndustry = ref('')

    const industries = ref([
      'Technology',
      'Finance',
      'Healthcare',
      'Consumer Goods',
      'Energy',
      'Real Estate'
    ])

    const news = computed(() => store.getters.getNews)
    const watchlist = computed(() => store.getters.getWatchlist)

    const filteredNews = computed(() => {
      if (selectedFilter.value === 'all') {
        return news.value
      } else if (selectedFilter.value === 'watchlist') {
        const watchlistSymbols = watchlist.value.map(company => company.symbol)
        return news.value.filter(article => 
          article.relatedSymbols.some(symbol => watchlistSymbols.includes(symbol))
        )
      } else if (selectedFilter.value === 'industry' && selectedIndustry.value) {
        return news.value.filter(article => 
          article.industries.includes(selectedIndustry.value)
        )
      }
      return news.value
    })

    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleDateString()
    }

    onMounted(() => {
      store.dispatch('fetchNews')
    })

    return {
      selectedFilter,
      selectedIndustry,
      industries,
      filteredNews,
      formatDate
    }
  }
}
</script>

<style scoped>
.news-panel {
  padding: 1rem;
}

.news-filters {
  margin-bottom: 1rem;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.news-item {
  padding: 1rem;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background-color: white;
}

.news-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.news-source {
  font-weight: bold;
  color: #495057;
}

.news-date {
  color: #6c757d;
}

.news-title {
  margin: 0.5rem 0;
  font-size: 1.1rem;
}

.news-summary {
  color: #495057;
  margin-bottom: 0.5rem;
}

.news-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.read-more {
  color: #42b983;
  text-decoration: none;
}

.news-tags {
  display: flex;
  gap: 0.5rem;
}

.news-tag {
  background-color: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #495057;
}
</style>
