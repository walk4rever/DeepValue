<template>
  <div class="company-detail" v-if="company">
    <div class="company-header">
      <div class="company-title">
        <h1>{{ company.name }} ({{ company.symbol }})</h1>
        <div class="company-price">
          <span class="current-price">${{ formatNumber(company.current_price) }}</span>
          <span :class="['price-change', company.price_change >= 0 ? 'positive' : 'negative']">
            {{ company.price_change >= 0 ? '+' : '' }}{{ formatNumber(company.price_change) }} 
            ({{ formatNumber(company.price_change_percent) }}%)
          </span>
        </div>
      </div>
      <div class="company-actions">
        <button @click="addToWatchlist" v-if="!isInWatchlist" class="add-btn">Add to Watchlist</button>
        <button @click="removeFromWatchlist" v-else class="remove-btn">Remove from Watchlist</button>
      </div>
    </div>

    <div class="company-content">
      <div class="company-overview">
        <h2>Company Overview</h2>
        <p>{{ company.description }}</p>
        <div class="company-info">
          <div class="info-item">
            <span class="info-label">Sector</span>
            <span class="info-value">{{ company.sector }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Industry</span>
            <span class="info-value">{{ company.industry }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Market Cap</span>
            <span class="info-value">${{ formatLargeNumber(company.market_cap) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Website</span>
            <a :href="company.website" target="_blank" class="info-value">{{ company.website }}</a>
          </div>
        </div>
      </div>

      <div class="financial-metrics">
        <h2>Key Financial Metrics</h2>
        <div class="metrics-grid">
          <div v-for="metric in company.key_metrics" :key="metric.name" class="metric-item">
            <span class="metric-name">{{ formatMetricName(metric.name) }}</span>
            <span class="metric-value">{{ formatMetricValue(metric.value, metric.unit) }}</span>
            <span class="metric-period">{{ metric.period }}</span>
          </div>
        </div>
      </div>

      <div class="historical-data">
        <h2>Historical Performance</h2>
        <div class="chart-container">
          <!-- Chart component would go here -->
          <div class="chart-placeholder">
            Chart visualization will be displayed here
          </div>
        </div>
        <div class="data-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Revenue</th>
                <th>Net Income</th>
                <th>EPS</th>
                <th>P/E Ratio</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(data, index) in company.historical_data" :key="index">
                <td>{{ data.date }}</td>
                <td>{{ data.revenue ? '$' + formatLargeNumber(data.revenue) : '-' }}</td>
                <td>{{ data.net_income ? '$' + formatLargeNumber(data.net_income) : '-' }}</td>
                <td>{{ data.eps ? '$' + formatNumber(data.eps) : '-' }}</td>
                <td>{{ data.pe_ratio ? formatNumber(data.pe_ratio) : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="company-news">
        <h2>Recent News</h2>
        <div class="news-list">
          <div v-if="news.length === 0" class="no-news">
            No recent news available for this company.
          </div>
          <div v-for="article in news" :key="article.id" class="news-item">
            <div class="news-header">
              <span class="news-source">{{ article.source }}</span>
              <span class="news-date">{{ formatDate(article.publishedAt) }}</span>
            </div>
            <h3 class="news-title">{{ article.title }}</h3>
            <p class="news-summary">{{ article.summary }}</p>
            <div class="news-footer">
              <a :href="article.url" target="_blank" class="read-more">Read more</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="loading">
    Loading company data...
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'

export default {
  name: 'CompanyDetail',
  props: {
    symbol: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const store = useStore()
    const news = ref([])

    const company = computed(() => store.getters.getCurrentCompany)
    const watchlist = computed(() => store.getters.getWatchlist)
    
    const isInWatchlist = computed(() => {
      return watchlist.value.some(item => item.symbol === props.symbol)
    })

    onMounted(async () => {
      // Fetch company details
      await store.dispatch('fetchCompanyDetails', props.symbol)
      
      // Fetch company-specific news
      await store.dispatch('fetchNews', { symbol: props.symbol })
      news.value = store.getters.getNews.filter(article => 
        article.relatedSymbols && article.relatedSymbols.includes(props.symbol)
      )
    })

    const formatNumber = (num) => {
      return num ? num.toFixed(2) : '0.00'
    }

    const formatLargeNumber = (num) => {
      if (!num) return '0'
      
      if (num >= 1e12) {
        return (num / 1e12).toFixed(2) + 'T'
      } else if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B'
      } else if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M'
      } else if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K'
      }
      
      return num.toFixed(2)
    }

    const formatMetricName = (name) => {
      return name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
    }

    const formatMetricValue = (value, unit) => {
      if (unit === '%') {
        return value.toFixed(2) + '%'
      } else if (unit === '$') {
        return '$' + formatNumber(value)
      }
      return formatNumber(value)
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString()
    }

    const addToWatchlist = () => {
      if (company.value) {
        store.dispatch('addToWatchlist', {
          symbol: company.value.symbol,
          name: company.value.name,
          sector: company.value.sector,
          industry: company.value.industry
        })
      }
    }

    const removeFromWatchlist = () => {
      if (company.value) {
        store.dispatch('removeFromWatchlist', company.value.symbol)
      }
    }

    return {
      company,
      news,
      isInWatchlist,
      formatNumber,
      formatLargeNumber,
      formatMetricName,
      formatMetricValue,
      formatDate,
      addToWatchlist,
      removeFromWatchlist
    }
  }
}
</script>

<style scoped>
.company-detail {
  padding: 2rem;
}

.company-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.company-title h1 {
  margin: 0 0 0.5rem 0;
}

.company-price {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.current-price {
  font-size: 1.5rem;
  font-weight: bold;
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

.company-actions {
  display: flex;
  gap: 1rem;
}

.add-btn, .remove-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.add-btn {
  background-color: #42b983;
  color: white;
}

.remove-btn {
  background-color: #dc3545;
  color: white;
}

.company-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

.company-overview, .financial-metrics, .historical-data, .company-news {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.company-info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-weight: bold;
  color: #6c757d;
  font-size: 0.9rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.metric-item {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border: 1px solid #e9ecef;
  border-radius: 8px;
}

.metric-name {
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.metric-value {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
}

.metric-period {
  font-size: 0.8rem;
  color: #6c757d;
}

.chart-container {
  margin: 1.5rem 0;
  height: 300px;
}

.chart-placeholder {
  height: 100%;
  background-color: #f8f9fa;
  border: 1px dashed #dee2e6;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #6c757d;
}

.data-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

th {
  background-color: #f8f9fa;
  font-weight: bold;
}

.news-list {
  margin-top: 1rem;
}

.news-item {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
}

.news-item:last-child {
  border-bottom: none;
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
  justify-content: flex-end;
}

.read-more {
  color: #42b983;
  text-decoration: none;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
  font-size: 1.2rem;
  color: #6c757d;
}

.no-news {
  padding: 1rem;
  text-align: center;
  color: #6c757d;
}

@media (min-width: 768px) {
  .company-content {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .company-overview {
    grid-column: 1 / -1;
  }
  
  .historical-data, .company-news {
    grid-column: 1 / -1;
  }
}
</style>
