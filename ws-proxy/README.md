# WebSocket 代理服务器

用于同声传译demo的WebSocket代理服务器，部署到Railway。

## 功能

1. **WebSocket代理** - 解决浏览器无法设置自定义HTTP Headers的问题
2. **房间管理** - 支持多用户加入同一房间
3. **消息路由** - 将用户A的翻译结果转发给房间内其他用户

## 本地开发

### 安装依赖

```bash
npm install
```

### 运行服务器

```bash
npm start
```

服务器将在 `http://localhost:3001` 启动。

### 测试连接

```javascript
// 浏览器中测试
const ws = new WebSocket('ws://localhost:3001?appId=YOUR_APP_ID&accessKey=YOUR_ACCESS_KEY&roomId=test123&userId=user1');
```

## 部署到 Railway

### 方法1：通过Railway CLI

1. 安装Railway CLI：
```bash
npm i -g @railway/cli
```

2. 登录Railway：
```bash
railway login
```

3. 初始化项目：
```bash
railway init
```

4. 部署：
```bash
railway up
```

### 方法2：通过GitHub连接

1. 将代码推送到GitHub仓库
2. 访问 [Railway Dashboard](https://railway.app)
3. 点击 "New Project"
4. 选择 "Deploy from GitHub repo"
5. 选择你的仓库
6. Railway会自动检测Node.js项目并部署

### 配置

Railway会自动：
- 检测 `package.json` 中的 `start` 脚本
- 使用 `PORT` 环境变量（Railway自动提供）
- 启用HTTPS/WSS

### 获取WebSocket URL

部署成功后，Railway会提供一个URL，例如：
- HTTP: `https://your-app.railway.app`
- WebSocket: `wss://your-app.railway.app`

## 连接参数

WebSocket连接URL格式：
```
wss://your-app.railway.app?appId=YOUR_APP_ID&accessKey=YOUR_ACCESS_KEY&roomId=ROOM_ID&userId=USER_ID
```

参数说明：
- `appId` (必需) - 火山引擎APP ID
- `accessKey` (必需) - 火山引擎Access Token（URL参数名保持accessKey）
- `roomId` (可选) - 房间ID，用于多用户交流
- `userId` (可选) - 用户ID，如果不提供会自动生成

## 健康检查

访问 `/health` 端点查看服务器状态：
```
GET https://your-app.railway.app/health
```

返回：
```json
{
  "status": "ok",
  "rooms": 2,
  "clients": 3,
  "timestamp": 1234567890
}
```

## 消息格式

### 服务器 -> 客户端

连接成功：
```json
{
  "type": "connected",
  "message": "Connected to translation service"
}
```

用户加入房间：
```json
{
  "type": "user_joined",
  "userId": "user123",
  "timestamp": 1234567890
}
```

用户离开房间：
```json
{
  "type": "user_left",
  "userId": "user123",
  "timestamp": 1234567890
}
```

翻译结果（转发给房间内其他用户）：
```json
{
  "type": "translation",
  "fromUserId": "user123",
  "data": "base64_encoded_protobuf_data",
  "timestamp": 1234567890
}
```

### 客户端 -> 服务器

直接发送Protobuf二进制数据，服务器会转发给字节跳动API。

## 注意事项

- Railway免费额度：$5/月，足够demo使用
- WebSocket连接会自动保持心跳（30秒）
- 房间为空时会自动清理
- 支持优雅关闭（SIGTERM信号）

