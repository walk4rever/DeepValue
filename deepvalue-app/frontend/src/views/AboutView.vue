<template>
  <div class="about">
    <div class="container">
      <h1>About DeepValue</h1>
      
      <div class="card">
        <h2>Our Mission</h2>
        <p>
          DeepValue is an investment research platform designed to help investors make informed decisions
          through data-driven analysis, AI-powered insights, and collaborative tools.
        </p>
      </div>
      
      <div class="card">
        <h2>Features</h2>
        <ul>
          <li><strong>Company Analysis:</strong> Comprehensive financial data and metrics for thousands of companies</li>
          <li><strong>AI Assistant:</strong> Get answers to your investment questions using our AI-powered chat interface</li>
          <li><strong>Watchlists:</strong> Track your favorite companies and get real-time updates</li>
          <li><strong>News Aggregation:</strong> Stay informed with the latest market and company-specific news</li>
          <li><strong>Research Notes:</strong> Save and organize your investment research in one place</li>
        </ul>
      </div>
      
      <div class="card">
        <h2>How It Works</h2>
        <p>
          DeepValue combines data from multiple financial sources and uses advanced algorithms to provide
          you with actionable insights. Our platform is built on the following principles:
        </p>
        <ul>
          <li><strong>Data Integrity:</strong> We source our data from reliable financial data providers</li>
          <li><strong>User Privacy:</strong> Your data and research are kept secure and private</li>
          <li><strong>Continuous Improvement:</strong> We regularly update our models and features based on user feedback</li>
        </ul>
      </div>
      
      <div class="card">
        <h2>Get Started</h2>
        <p>
          Ready to dive deeper into your investment research? Head back to the 
          <router-link to="/">home page</router-link> to start exploring companies,
          or create an account to save your research and preferences.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about {
  padding: 2rem 0;
}

h1 {
  margin-bottom: 2rem;
  color: #2c3e50;
  text-align: center;
}

h2 {
  color: #42b983;
  margin-bottom: 1rem;
}

.card {
  margin-bottom: 2rem;
}

ul {
  padding-left: 1.5rem;
  margin: 1rem 0;
}

li {
  margin-bottom: 0.5rem;
}

a {
  color: #42b983;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>
