# Vercel 前端部署指南

## 🚀 快速部署步骤

### 第一步：注册并登录

1. 访问 https://vercel.com
2. 点击右上角 "Sign Up"
3. 选择 "Continue with GitHub"
4. 授权GitHub账号

### 第二步：创建新项目

1. 登录后，点击右上角 **"Add New..."** → **"Project"**
2. 在 "Import Git Repository" 中
3. 选择 **"YoungBlackBlack/s2s"** 仓库
4. 点击 **"Import"**

### 第三步：配置项目

**框架预设：**
- 选择 **"Other"** 或 **"Other Framework"**
- Vercel会自动检测为静态网站

**项目设置：**
- **Project Name**: `s2s-translation`（可以自定义）
- **Root Directory**: 留空（使用根目录）
- **Framework Preset**: Other
- **Build Command**: 留空（静态文件，无需构建）
- **Output Directory**: 留空

### 第四步：配置环境变量（重要！）

在 "Environment Variables" 部分，添加以下变量：

1. **APP_ID**
   - Key: `APP_ID`
   - Value: 你的火山引擎 APP ID
   - Environment: Production, Preview, Development（全选）

2. **ACCESS_TOKEN**
   - Key: `ACCESS_TOKEN`
   - Value: 你的火山引擎 Access Token
   - Environment: Production, Preview, Development（全选）

3. **可选配置**（有默认值，可不配置）：
   - `TOKEN_PRICE_INPUT` = `80`
   - `TOKEN_PRICE_OUTPUT_TEXT` = `80`
   - `TOKEN_PRICE_OUTPUT_AUDIO` = `300`

### 第五步：部署

1. 点击页面底部的 **"Deploy"** 按钮
2. Vercel会自动开始部署
3. 等待1-2分钟，查看部署日志

### 第六步：获取部署URL

部署成功后：

1. 你会看到一个URL，例如：
   ```
   https://s2s-translation.vercel.app
   ```
   或
   ```
   https://s2s-translation-xxx.vercel.app
   ```

2. 点击URL即可访问你的应用！

## ✅ 部署后检查

### 1. 测试应用

访问你的Vercel URL，应该能看到：
- 登录页面
- 可以输入用户名登录
- 可以创建/加入房间
- 可以开始翻译

### 2. 检查环境变量

如果应用无法连接，检查：
1. Vercel Dashboard → 项目 → Settings → Environment Variables
2. 确认 `APP_ID` 和 `ACCESS_TOKEN` 都已配置
3. 确认环境变量已应用到所有环境（Production, Preview, Development）

### 3. 检查Render服务

确认Render服务正常运行：
```
https://s2s-dxla.onrender.com/health
```

## 🔧 常见问题

### Q: 部署后显示404

**A:** 检查：
1. 根目录设置是否正确（应该留空）
2. 确认 `index.html` 在根目录
3. 查看Vercel部署日志

### Q: 无法连接WebSocket

**A:** 检查：
1. Render服务是否正常运行
2. `config.js` 中的URL是否正确（`wss://s2s-dxla.onrender.com`）
3. 浏览器控制台是否有错误

### Q: 环境变量未生效

**A:** 
1. 确认环境变量已保存
2. 重新部署项目（Redeploy）
3. 检查环境变量是否应用到所有环境

### Q: 如何重新部署

**A:**
1. 在Vercel Dashboard中进入项目
2. 点击 "Deployments" 标签
3. 点击最新部署右侧的 "..." 菜单
4. 选择 "Redeploy"

## 📋 部署检查清单

部署前：
- [ ] Vercel账号已注册
- [ ] GitHub仓库已连接
- [ ] 环境变量已配置（APP_ID, ACCESS_TOKEN）
- [ ] Render服务已部署并正常运行

部署后：
- [ ] 可以访问Vercel URL
- [ ] 登录页面正常显示
- [ ] 可以创建/加入房间
- [ ] WebSocket连接正常
- [ ] 翻译功能正常

## 🎉 完成！

部署成功后，你就可以：
1. 分享Vercel URL给其他人
2. 两个用户分别登录
3. 创建/加入同一个房间
4. 开始实时语音翻译交流！

## 🔗 相关链接

- Render服务：https://s2s-dxla.onrender.com
- Render健康检查：https://s2s-dxla.onrender.com/health
- Vercel Dashboard：https://vercel.com/dashboard

