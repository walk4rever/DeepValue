const { defineConfig } = require('@vue/cli-service')
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

// Load environment variables from root .env file
const rootEnvPath = path.resolve(__dirname, '../.env')
let envConfig = {}

if (fs.existsSync(rootEnvPath)) {
  envConfig = dotenv.parse(fs.readFileSync(rootEnvPath))
  
  // Convert environment variables to process.env format
  Object.keys(envConfig).forEach(key => {
    if (key.startsWith('VITE_')) {
      process.env[key] = envConfig[key]
    }
  })
}

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    port: 8080,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  chainWebpack: config => {
    config.plugin('define').tap(args => {
      const env = {}
      
      // Add all VITE_ prefixed variables
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('VITE_')) {
          env[`process.env.${key}`] = JSON.stringify(process.env[key])
        }
      })
      
      args[0]['process.env'] = {
        ...args[0]['process.env'],
        ...env
      }
      
      return args
    })
  }
})
