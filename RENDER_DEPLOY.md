# Render 部署指南（免费替代方案）

如果Railway受限，可以使用Render免费部署WebSocket代理服务器。

## Render 免费计划

- ✅ 支持WebSocket长连接
- ✅ 免费额度充足
- ✅ 自动HTTPS/WSS
- ✅ 简单部署

## 部署步骤

### 1. 注册Render账号

1. 访问 [Render](https://render.com)
2. 使用GitHub账号登录（免费）

### 2. 创建Web服务

1. 在Render Dashboard点击 "New +"
2. 选择 "Web Service"
3. 选择 "Build and deploy from a Git repository"
4. 连接GitHub仓库：`YoungBlackBlack/s2s`

### 3. 配置服务

**基本信息：**
- **Name**: `s2s-ws-proxy`（或任意名称）
- **Region**: 选择离你最近的区域
- **Branch**: `main`
- **Root Directory**: `ws-proxy` ⚠️ **重要**

**构建和启动：**
- **Build Command**: `npm install`（或留空，Render会自动检测）
- **Start Command**: `npm start`（或留空，Render会自动检测）

**环境变量：**
- 不需要特殊环境变量（Railway的PORT会自动提供）

### 4. 部署

1. 点击 "Create Web Service"
2. Render会自动开始部署
3. 等待部署完成（约2-3分钟）

### 5. 获取WebSocket URL

部署成功后，Render会提供一个URL：
- 格式：`https://s2s-ws-proxy.onrender.com`
- WebSocket地址：`wss://s2s-ws-proxy.onrender.com`（注意是wss）

### 6. 更新config.js

```javascript
window.WS_PROXY_URL = 'wss://s2s-ws-proxy.onrender.com'; // 替换为你的Render URL
```

## Render vs Railway

| 特性 | Render | Railway |
|------|--------|---------|
| 免费计划 | ✅ 有 | ❌ 受限 |
| WebSocket支持 | ✅ | ✅ |
| 自动部署 | ✅ | ✅ |
| 免费额度 | 充足 | 受限 |

## 注意事项

1. **免费计划限制**：
   - 服务在15分钟无活动后会休眠
   - 首次访问需要几秒唤醒时间
   - 对于demo使用完全足够

2. **Root Directory**：
   - 必须设置为 `ws-proxy`
   - 否则找不到package.json

3. **健康检查**：
   - 部署后访问：`https://your-app.onrender.com/health`
   - 应该返回JSON状态

## 故障排查

### 部署失败

1. 检查Root Directory是否为 `ws-proxy`
2. 查看构建日志中的错误
3. 确认package.json存在

### 服务无法连接

1. 等待服务完全启动（查看日志）
2. 确认使用 `wss://` 协议
3. 检查服务是否在运行（Render Dashboard）

