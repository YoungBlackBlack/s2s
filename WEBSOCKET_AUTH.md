# WebSocket 鉴权问题解决方案

## 问题说明

浏览器原生的 WebSocket API 不支持在连接时设置自定义 HTTP Headers，而字节跳动 AST API 需要通过 HTTP Headers 传递鉴权信息：

- `X-Api-App-Key`
- `X-Api-Access-Key`
- `X-Api-Resource-Id`

## 解决方案

### 方案1：WebSocket 代理服务器（推荐生产环境）

创建一个 Node.js WebSocket 代理服务器，在服务器端添加鉴权 Headers。

#### 代理服务器代码示例

```javascript
// ws-proxy-server.js
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs, req) => {
  // 从请求中获取鉴权信息（可以通过URL参数或Cookie传递）
  const appId = new URL(req.url, 'http://localhost').searchParams.get('appId');
  const accessKey = new URL(req.url, 'http://localhost').searchParams.get('accessKey');
  
  // 连接到字节跳动服务器
  const targetWs = new WebSocket('wss://openspeech.bytedance.com/api/v4/ast/v2/translate', {
    headers: {
      'X-Api-App-Key': appId,
      'X-Api-Access-Key': accessKey,
      'X-Api-Resource-Id': 'volc.service_type.10053'
    }
  });
  
  // 双向转发消息
  clientWs.on('message', (data) => {
    if (targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(data);
    }
  });
  
  targetWs.on('message', (data) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });
  
  clientWs.on('close', () => targetWs.close());
  targetWs.on('close', () => clientWs.close());
});

server.listen(3001, () => {
  console.log('WebSocket代理服务器运行在 ws://localhost:3001');
});
```

#### 前端连接代码

```javascript
// 连接到代理服务器
const ws = new WebSocket(`ws://your-proxy-server.com/ws?appId=${appId}&accessKey=${accessKey}`);
```

### 方案2：使用支持自定义 Headers 的 WebSocket 库

使用第三方库如 `websocket` 或 `ws`（Node.js环境），但这些库在浏览器中不可用。

### 方案3：临时开发方案（仅用于开发测试）

在开发环境中，可以直接在前端代码中配置鉴权信息（**不安全，仅用于开发**）：

```javascript
// 仅用于开发测试
const DEV_AUTH = {
  appId: 'your-app-id',
  accessKey: 'your-access-key',
  resourceId: 'volc.service_type.10053'
};

// 在发送StartSession消息时，将鉴权信息包含在消息体中
// 注意：这需要API支持在消息体中传递鉴权信息
```

### 方案4：使用 Vercel Edge Functions（实验性）

Vercel Edge Functions 支持 WebSocket，但功能有限。可以尝试使用 Edge Functions 创建代理。

## 推荐实施步骤

1. **开发阶段**：使用方案3（临时方案）进行开发和测试
2. **生产环境**：部署方案1（WebSocket代理服务器）
   - 可以使用 Vercel 的 Serverless Functions（但需要处理长连接）
   - 或使用独立的 Node.js 服务器（如 Railway、Render 等）

## 部署 WebSocket 代理服务器

### 使用 Railway

1. 创建 `package.json`：
```json
{
  "name": "ws-proxy",
  "version": "1.0.0",
  "main": "ws-proxy-server.js",
  "dependencies": {
    "ws": "^8.14.0"
  }
}
```

2. 部署到 Railway：
```bash
railway init
railway up
```

### 使用 Render

1. 创建 `render.yaml`：
```yaml
services:
  - type: web
    name: ws-proxy
    env: node
    buildCommand: npm install
    startCommand: node ws-proxy-server.js
```

2. 部署到 Render

## 注意事项

- WebSocket 代理服务器需要保持长连接，确保服务器稳定运行
- 生产环境必须使用 HTTPS/WSS
- 建议添加访问频率限制和IP白名单
- 鉴权信息应该通过环境变量配置，不要硬编码

## 当前项目状态

当前项目代码中已经包含了基本的 WebSocket 连接逻辑，但需要根据选择的方案进行调整：

- 如果使用代理服务器，修改 `connectWebSocket` 函数中的 `wsUrl`
- 如果使用临时方案，确保鉴权信息正确配置

