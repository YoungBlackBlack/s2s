# 部署指南

## 部署架构

```
前端 (Vercel) ──> Railway WebSocket代理服务器 ──> 字节跳动AST API
```

## 第一步：部署WebSocket代理服务器到Railway

### 1. 准备Railway账号

1. 访问 [Railway](https://railway.app)
2. 使用GitHub账号登录（免费）
3. Railway提供$5/月免费额度，足够demo使用

### 2. 部署代理服务器

#### 方法A：通过GitHub连接（推荐）

1. 将代码推送到GitHub仓库
2. 在Railway Dashboard点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择你的仓库
5. **重要**：设置根目录为 `ws-proxy`
   - 在项目设置中找到 "Root Directory"
   - 设置为 `ws-proxy`
6. Railway会自动检测Node.js项目并部署

#### 方法B：通过Railway CLI

```bash
# 安装Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 在ws-proxy目录下初始化
cd ws-proxy
railway init

# 部署
railway up
```

### 3. 获取WebSocket URL

部署成功后，Railway会提供一个URL，例如：
- `https://your-app.railway.app`
- WebSocket地址：`wss://your-app.railway.app`

### 4. 测试代理服务器

访问健康检查端点：
```
https://your-app.railway.app/health
```

应该返回：
```json
{
  "status": "ok",
  "rooms": 0,
  "clients": 0,
  "timestamp": 1234567890
}
```

## 第二步：部署前端到Vercel

### 1. 配置环境变量

在Vercel Dashboard中配置以下环境变量：

**必需：**
- `APP_ID` - 火山引擎APP ID
- `ACCESS_KEY` - 火山引擎Access Key

**可选：**
- `TOKEN_PRICE_INPUT` - 80（默认值）
- `TOKEN_PRICE_OUTPUT_TEXT` - 80（默认值）
- `TOKEN_PRICE_OUTPUT_AUDIO` - 300（默认值）

### 2. 配置WebSocket代理URL

有两种方式配置Railway代理服务器URL：

#### 方式A：在Vercel环境变量中配置（推荐）

1. 在Vercel Dashboard添加环境变量：
   - `WS_PROXY_URL` = `wss://your-app.railway.app`

2. 修改 `index.html`，在加载app.js之前添加：
```html
<script>
  window.WS_PROXY_URL = '<%= process.env.WS_PROXY_URL || "wss://your-app.railway.app" %>';
</script>
```

#### 方式B：直接在代码中配置

修改 `assets/app.js`，找到这一行：
```javascript
wsProxyUrl = window.WS_PROXY_URL || 'wss://your-app.railway.app';
```

将 `'wss://your-app.railway.app'` 替换为你的Railway URL。

### 3. 部署到Vercel

#### 通过GitHub连接

1. 在Vercel Dashboard点击 "New Project"
2. 选择你的GitHub仓库
3. 框架预设选择 "Other" 或 "Static"
4. 点击 "Deploy"

#### 通过Vercel CLI

```bash
npm i -g vercel
vercel
```

## 第三步：测试

### 1. 测试单用户功能

1. 访问Vercel部署的URL
2. 登录（输入用户名）
3. 创建房间
4. 开始录音，测试翻译功能

### 2. 测试双人交流

1. 打开两个浏览器窗口（或两个设备）
2. 两个用户分别登录
3. 用户A创建房间，获取房间号
4. 用户B输入房间号加入
5. 两个用户开始说话，测试翻译结果是否互相显示

## 故障排查

### WebSocket连接失败

1. 检查Railway代理服务器是否正常运行
   - 访问 `/health` 端点
2. 检查WebSocket URL配置是否正确
   - 确保使用 `wss://` 协议（HTTPS）
3. 检查浏览器控制台错误信息

### 翻译结果不显示

1. 检查鉴权信息是否正确
2. 检查Protobuf消息解析是否正常
3. 查看浏览器控制台和Railway日志

### 房间消息不转发

1. 检查两个用户是否在同一个房间
2. 检查Railway服务器日志
3. 确保房间ID正确

## 费用说明

- **Railway**：$5/月免费额度，足够demo使用
- **Vercel**：免费计划足够使用
- **字节跳动AST API**：按实际使用量计费（见Token统计页面）

## 下一步优化

- [ ] 添加错误重试机制
- [ ] 优化WebSocket连接稳定性
- [ ] 添加房间内用户列表显示
- [ ] 支持更多语言对
- [ ] 添加录音历史记录

