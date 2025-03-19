# DeepValue - 智能投资分析平台

一个使用AWS Bedrock Claude模型的智能投资分析平台，可以帮助用户分析股票、解答投资问题或提供市场见解。

## 功能特点

- 与Claude AI模型对话，获取投资建议
- 分析股票基本面
- 行业对比分析
- 财务健康评估
- 投资组合优化
- **全面数据分析**: 整合财务报表、市场数据、行业趋势等多维度信息
- **价值投资筛选**: 基于巴菲特、格雷厄姆等投资大师的价值投资理念
- **AI辅助决策**: 运用先进的机器学习算法，预测股票走势

## 安装与设置

1. 克隆仓库
```
git clone <repository-url>
cd DeepValue
```

2. 安装依赖
```
npm install
```

3. 配置AWS凭证
将`.env.aws.example`文件复制为`.env.aws`，并填入您的AWS凭证：
```
cp .env.aws.example .env.aws
```
然后编辑`.env.aws`文件，填入您的AWS访问密钥和区域信息。

4. 启动服务器
```
npm start
```

5. 访问应用
在浏览器中打开`http://localhost:3000`

## 使用方法

1. 在聊天框中输入您的投资相关问题
2. 点击"发送"按钮或按回车键发送消息
3. 等待AI助手回复
4. 您也可以点击预设的分析选项或工具选项来快速提问

## 技术栈

- 前端：HTML, CSS, JavaScript
- 后端：Node.js, Express
- AI模型：AWS Bedrock Claude
- 其他：AWS SDK, dotenv

## 项目结构

```
DeepValue/
├── index.html      # 主页面
├── server.js       # 后端服务器
├── package.json    # 项目依赖
├── .env.aws        # AWS凭证配置（需自行创建）
├── .env.aws.example # AWS凭证示例
└── README.md       # 项目说明文档
```

## 注意事项

- 确保您的AWS账户已启用Bedrock服务并有权限使用Claude模型
- 本应用仅供学习和研究使用，不构成投资建议
- 请勿在生产环境中使用示例代码，应当进行适当的安全加固

## 未来开发计划

- 添加用户认证系统
- 开发个性化投资组合推荐功能
- 集成实时市场数据
- 添加历史对话保存功能
