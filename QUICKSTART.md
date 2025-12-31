# 快速开始指南

## 📋 前置要求

1. Node.js 16+ 已安装
2. 火山引擎账号和 API 凭证
3. Vercel 账号（用于部署）

## 🚀 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 构建 Protobuf 文件

```bash
npm run build-protos
```

这将把 `.proto` 文件转换为浏览器可用的 JSON 格式。

### 3. 配置鉴权信息

由于浏览器 WebSocket 的限制，需要选择以下方案之一：

#### 方案A：使用 WebSocket 代理服务器（推荐）

1. 部署 WebSocket 代理服务器（参考 `WEBSOCKET_AUTH.md`）
2. 修改 `assets/app.js` 中的 `connectWebSocket` 函数，使用代理服务器地址

#### 方案B：临时开发方案

在 `assets/app.js` 中直接配置鉴权信息（仅用于开发）：

```javascript
// 在 connectWebSocket 函数中
window.wsAuth = {
    appId: 'your-app-id',
    accessKey: 'your-access-key',
    resourceId: 'volc.service_type.10053'
};
```

### 4. 本地运行

```bash
npm run dev
```

或使用简单的 HTTP 服务器：

```bash
# 使用 Python
python -m http.server 8000

# 或使用 Node.js
npx serve .
```

访问 `http://localhost:8000`

## 🌐 部署到 Vercel

### 1. 准备代码

确保所有文件已提交到 Git：

```bash
git add .
git commit -m "Initial commit"
git push
```

### 2. 在 Vercel 部署

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "New Project"
3. 导入 GitHub 仓库 `YoungBlackBlack/s2s`
4. 配置环境变量：
   - `APP_ID` - 你的 APP ID
   - `ACCESS_KEY` - 你的 Access Key
   - `TOKEN_PRICE_INPUT` - 80（可选）
   - `TOKEN_PRICE_OUTPUT_TEXT` - 80（可选）
   - `TOKEN_PRICE_OUTPUT_AUDIO` - 300（可选）
5. 点击 "Deploy"

### 3. 配置 WebSocket 代理

部署后，需要配置 WebSocket 代理服务器（参考 `WEBSOCKET_AUTH.md`）

## 🔧 常见问题

### Q: Protobuf 加载失败？

A: 确保已运行 `npm run build-protos` 生成 bundle.js 文件。

### Q: WebSocket 连接失败？

A: 检查鉴权信息是否正确，并确保使用 WebSocket 代理服务器。

### Q: 音频无法录制？

A: 确保浏览器已授予麦克风权限，并检查浏览器控制台是否有错误。

### Q: Token 统计不显示？

A: 检查 localStorage 是否可用，并确保 UsageResponse 消息正确解析。

## 📝 下一步

- [ ] 配置 WebSocket 代理服务器
- [ ] 测试所有功能
- [ ] 优化性能和用户体验
- [ ] 添加错误处理和重试机制

## 🆘 需要帮助？

- 查看 `README.md` 了解详细文档
- 查看 `WEBSOCKET_AUTH.md` 了解 WebSocket 鉴权方案
- 查看接口文档了解 API 详情

