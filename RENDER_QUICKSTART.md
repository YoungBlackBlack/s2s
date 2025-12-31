# Render 快速部署指南

## 🚀 5分钟快速部署

### 第一步：注册并登录

1. 访问 https://render.com
2. 点击右上角 "Get Started for Free"
3. 选择 "Sign up with GitHub"
4. 授权GitHub账号

### 第二步：创建Web服务

1. 登录后，点击右上角 **"New +"** 按钮
2. 选择 **"Web Service"**

### 第三步：连接GitHub仓库

1. 在 "Connect a repository" 页面
2. 选择 **"YoungBlackBlack/s2s"** 仓库
3. 点击 **"Connect"**

### 第四步：配置服务（重要！）

填写以下信息：

**基本信息：**
- **Name**: `s2s-ws-proxy`（可以自定义）
- **Region**: 选择 `Oregon (US West)` 或离你最近的
- **Branch**: `main`
- **Root Directory**: ⚠️ **`ws-proxy`** （必须填写！）

**构建和启动：**
- **Runtime**: `Node`
- **Build Command**: 留空（Render会自动运行 `npm install`）
- **Start Command**: 留空（Render会自动运行 `npm start`）

**计划：**
- 选择 **"Free"** 计划

### 第五步：部署

1. 点击页面底部的 **"Create Web Service"**
2. Render会自动开始部署
3. 等待2-3分钟，查看部署日志

### 第六步：获取WebSocket URL

部署成功后：

1. 在服务页面，你会看到一个URL，例如：
   ```
   https://s2s-ws-proxy.onrender.com
   ```

2. **WebSocket地址**（重要）：
   ```
   wss://s2s-ws-proxy.onrender.com
   ```
   ⚠️ 注意：使用 `wss://`（不是 `https://`）

### 第七步：更新前端配置

1. 编辑 `config.js` 文件：
   ```javascript
   window.WS_PROXY_URL = 'wss://s2s-ws-proxy.onrender.com'; // 替换为你的实际URL
   ```

2. 提交并推送：
   ```bash
   git add config.js
   git commit -m "配置Render WebSocket URL"
   git push
   ```

### 第八步：测试

1. 访问健康检查端点：
   ```
   https://s2s-ws-proxy.onrender.com/health
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

2. 如果返回正常，说明部署成功！

## ⚠️ 重要提示

### Root Directory 必须设置

如果Root Directory留空或设置错误，Render会找不到 `package.json`，导致部署失败。

**正确设置：** `ws-proxy`

### 免费计划说明

- ✅ 完全免费
- ⚠️ 服务在15分钟无活动后会休眠
- ⚠️ 首次访问需要几秒唤醒时间
- ✅ 对于demo使用完全足够

### 如果部署失败

1. **检查Root Directory**：必须是 `ws-proxy`
2. **查看构建日志**：点击 "Logs" 标签查看错误
3. **确认文件存在**：确保 `ws-proxy/package.json` 和 `ws-proxy/server.js` 存在

## 📋 检查清单

部署前确认：
- [ ] Render账号已注册
- [ ] GitHub仓库已连接
- [ ] Root Directory设置为 `ws-proxy`
- [ ] Build Command和Start Command留空（让Render自动检测）

部署后确认：
- [ ] 服务状态显示 "Live"
- [ ] 健康检查端点返回正常
- [ ] 获取了WebSocket URL（wss://开头）
- [ ] 更新了config.js中的URL

## 🎉 完成！

部署成功后，你就可以：
1. 部署前端到Vercel
2. 配置环境变量
3. 开始测试双人翻译功能！

