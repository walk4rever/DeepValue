<template>
  <div id="app">
    <header class="app-header">
      <div class="logo">
        <img alt="DeepValue logo" src="./assets/logo.png" height="40">
        <h1>DeepValue</h1>
      </div>
      <nav>
        <router-link to="/">Home</router-link>
        <router-link to="/about">About</router-link>
      </nav>
    </header>

    <main>
      <router-view />
    </main>

    <footer class="app-footer">
      <p>&copy; 2025 DeepValue - Investment Research Platform</p>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.logo {
  display: flex;
  align-items: center;
}

.logo h1 {
  margin-left: 10px;
  font-size: 1.5rem;
  font-weight: 600;
}

nav {
  display: flex;
  gap: 20px;
}

nav a {
  color: #2c3e50;
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem;
}

nav a.router-link-exact-active {
  color: #42b983;
  border-bottom: 2px solid #42b983;
}

main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.app-footer {
  padding: 1rem;
  text-align: center;
  background-color: #f8f9fa;
  border-top: 1px solid #e9ecef;
  font-size: 0.9rem;
  color: #6c757d;
}
</style>
