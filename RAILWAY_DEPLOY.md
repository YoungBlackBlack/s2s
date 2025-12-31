# Railway 部署详细步骤

## 问题：Railway 没有自动部署

如果Railway没有自动部署，请按照以下步骤操作：

## 方法1：手动设置根目录（推荐）

### 步骤：

1. **访问 Railway Dashboard**
   - 登录 [Railway](https://railway.app)
   - 进入你的项目

2. **设置根目录**
   - 点击项目设置（Settings）
   - 找到 "Root Directory" 选项
   - 输入：`ws-proxy`
   - 保存

3. **手动触发部署**
   - 点击 "Deployments" 标签
   - 点击 "Redeploy" 或 "Deploy"
   - Railway会重新检测并部署

4. **检查部署日志**
   - 在 "Deployments" 中查看部署日志
   - 确认是否成功

## 方法2：使用Railway CLI部署

如果Web界面有问题，可以使用CLI：

```bash
# 1. 安装Railway CLI
npm i -g @railway/cli

# 2. 登录
railway login

# 3. 进入ws-proxy目录
cd ws-proxy

# 4. 初始化项目（如果还没有）
railway init

# 5. 设置服务名称（可选）
railway service

# 6. 部署
railway up
```

## 方法3：创建独立的Railway项目

如果上述方法都不行，可以创建一个独立的Railway项目：

### 步骤：

1. **在Railway创建新项目**
   - 点击 "New Project"
   - 选择 "Empty Project"

2. **连接GitHub仓库**
   - 点击 "GitHub Repo"
   - 选择 `YoungBlackBlack/s2s`

3. **设置服务**
   - 点击 "New Service" → "GitHub Repo"
   - 选择仓库
   - **重要**：在服务设置中，设置 "Root Directory" 为 `ws-proxy`

4. **配置启动命令**
   - 在服务设置中找到 "Settings"
   - 找到 "Start Command"
   - 设置为：`npm start`
   - 或者留空，Railway会自动检测

5. **部署**
   - Railway会自动开始部署
   - 查看部署日志确认

## 检查清单

部署前确认：

- [ ] 根目录设置为 `ws-proxy`
- [ ] `ws-proxy/package.json` 存在
- [ ] `ws-proxy/server.js` 存在
- [ ] `package.json` 中有 `start` 脚本
- [ ] Node.js版本 >= 16（在package.json的engines中指定）

## 常见问题

### Q: Railway显示"Build failed"

**A:** 检查：
1. 根目录是否正确设置为 `ws-proxy`
2. `package.json` 是否存在
3. 查看构建日志中的错误信息

### Q: 部署成功但无法连接

**A:** 检查：
1. 服务是否正在运行（查看Logs）
2. 端口是否正确（Railway会自动设置PORT环境变量）
3. WebSocket URL是否正确（使用 `wss://` 协议）

### Q: 如何查看部署日志

**A:** 
1. 在Railway Dashboard中点击你的服务
2. 点击 "Deployments" 标签
3. 点击最新的部署记录
4. 查看 "Build Logs" 和 "Deploy Logs"

## 验证部署

部署成功后：

1. **检查健康端点**
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

2. **获取WebSocket URL**
   - Railway提供的URL就是WebSocket地址
   - 格式：`wss://your-app.railway.app`
   - 注意：使用 `wss://`（不是 `https://`）

3. **更新config.js**
   ```javascript
   window.WS_PROXY_URL = 'wss://your-app.railway.app';
   ```

## 需要帮助？

如果还是无法部署，请：
1. 截图Railway的部署日志
2. 检查Railway Dashboard中的错误信息
3. 确认GitHub仓库连接正常

