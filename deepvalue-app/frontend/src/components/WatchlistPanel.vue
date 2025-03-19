<template>
  <div class="watchlist-panel">
    <h2>Watchlist</h2>
    <div class="watchlist-controls">
      <input v-model="searchQuery" placeholder="Search companies..." class="search-input" />
      <button @click="showAddCompanyModal" class="add-btn">+ Add Company</button>
    </div>
    
    <div class="watchlist-categories">
      <div v-for="category in categories" :key="category.id" class="category">
        <h3>{{ category.name }}</h3>
        <div class="company-list">
          <div v-for="company in filteredCompaniesByCategory(category.id)" 
               :key="company.symbol"
               class="company-item"
               @click="navigateToCompany(company.symbol)">
            <div class="company-info">
              <span class="company-symbol">{{ company.symbol }}</span>
              <span class="company-name">{{ company.name }}</span>
            </div>
            <div class="company-metrics">
              <span :class="['price-change', company.priceChange >= 0 ? 'positive' : 'negative']">
                {{ formatPriceChange(company.priceChange) }}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'

export default {
  name: 'WatchlistPanel',
  setup() {
    const store = useStore()
    const router = useRouter()
    const searchQuery = ref('')

    const categories = computed(() => [
      { id: 1, name: 'Technology' },
      { id: 2, name: 'Finance' },
      { id: 3, name: 'Healthcare' },
      { id: 4, name: 'Consumer' }
    ])

    const watchlist = computed(() => store.getters.getWatchlist)

    const filteredCompaniesByCategory = (categoryId) => {
      return watchlist.value
        .filter(company => company.categoryId === categoryId)
        .filter(company => 
          company.symbol.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          company.name.toLowerCase().includes(searchQuery.value.toLowerCase())
        )
    }

    const navigateToCompany = (symbol) => {
      router.push({ name: 'company-detail', params: { symbol } })
    }

    const formatPriceChange = (change) => {
      return change.toFixed(2)
    }

    const showAddCompanyModal = () => {
      // Implement add company modal logic
    }

    return {
      searchQuery,
      categories,
      filteredCompaniesByCategory,
      navigateToCompany,
      formatPriceChange,
      showAddCompanyModal
    }
  }
}
</script>

<style scoped>
.watchlist-panel {
  padding: 1rem;
}

.watchlist-controls {
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.add-btn {
  width: 100%;
  padding: 0.5rem;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.category {
  margin-bottom: 1.5rem;
}

.company-item {
  padding: 0.75rem;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.company-item:hover {
  background-color: #f8f9fa;
}

.company-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.company-symbol {
  font-weight: bold;
}

.company-name {
  color: #6c757d;
  font-size: 0.9em;
}

.price-change {
  font-weight: bold;
}

.price-change.positive {
  color: #28a745;
}

.price-change.negative {
  color: #dc3545;
}
</style>
