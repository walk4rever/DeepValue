# DeepValue

智能投资分析平台 - 利用人工智能和大数据分析，为您提供深度价值投资洞察

## 项目概述

DeepValue 是一个基于网页的投资分析平台，旨在帮助投资者做出更明智的投资决策。该平台整合了财务数据分析、价值投资筛选和人工智能辅助决策等功能。

## 快速开始

### 方法 1: 直接在浏览器中打开

最简单的方法是直接在浏览器中打开 HTML 文件:

1. 在文件浏览器中找到 `index.html` 文件
2. 双击该文件，它将在您的默认浏览器中打开

### 方法 2: 使用 Python 的 HTTP 服务器

如果您想模拟真实的网络环境，可以使用 Python 的内置 HTTP 服务器:

1. 打开终端
2. 导航到项目目录: `cd /path/to/DeepValue`
3. 运行以下命令:
   - Python 3: `python -m http.server 8000`
   - Python 2: `python -m SimpleHTTPServer 8000`
4. 在浏览器中访问: `http://localhost:8000`

### 方法 3: 使用 Node.js 的 http-server

如果您已安装 Node.js:

1. 全局安装 http-server: `npm install -g http-server`
2. 导航到项目目录: `cd /path/to/DeepValue`
3. 运行: `http-server -p 8000`
4. 在浏览器中访问: `http://localhost:8000`

## 项目结构

```
DeepValue/
├── index.html      # 主页面
└── README.md       # 项目说明文档
```

## 功能特点

- **全面数据分析**: 整合财务报表、市场数据、行业趋势等多维度信息
- **价值投资筛选**: 基于巴菲特、格雷厄姆等投资大师的价值投资理念
- **AI辅助决策**: 运用先进的机器学习算法，预测股票走势

## 未来开发计划

- 实现后端 API 连接
- 添加用户认证系统
- 开发个性化投资组合推荐功能
- 集成实时市场数据
