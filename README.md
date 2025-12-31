# 同声传译 Demo

基于字节跳动 AST（同声传译）服务的实时语音翻译演示应用，支持中英互译，适配移动端和PC端。

## ✨ 功能特性

- 🎤 **实时语音流处理** - 非录音模式，持续流式输入
- 🌐 **中英互译** - 支持中文↔英文实时翻译
- 💬 **字幕显示** - 只显示译文，居中显示，新字幕上移效果
- 🎨 **炫酷视觉效果** - 渐变背景、粒子动画、音频波形可视化、流畅动画
- 📊 **Token统计** - 实时统计token消耗和费用计算
- 📱 **响应式设计** - 自动适配移动端和PC端，无需用户选择
- 🎯 **打字机效果** - 文字逐字显示，提升视觉体验

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone git@github.com:YoungBlackBlack/s2s.git
cd s2s
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

在 Vercel 控制台配置以下环境变量：

- `APP_ID` - 火山引擎控制台获取的 APP ID
- `ACCESS_TOKEN` - 火山引擎控制台获取的 Access Token（环境变量名，也可以使用ACCESS_KEY）
- `TOKEN_PRICE_INPUT` - 输入音频token单价（元/百万Token，默认80）
- `TOKEN_PRICE_OUTPUT_TEXT` - 输出文本token单价（元/百万Token，默认80）
- `TOKEN_PRICE_OUTPUT_AUDIO` - 输出音频token单价（元/百万Token，默认300）

### 4. 部署到 Vercel

#### 方式一：通过 Vercel CLI

```bash
npm i -g vercel
vercel
```

#### 方式二：通过 GitHub 连接

1. 将代码推送到 GitHub 仓库
2. 在 [Vercel Dashboard](https://vercel.com/dashboard) 中导入项目
3. 配置环境变量
4. 自动部署

### 5. 访问应用

部署完成后，访问 Vercel 提供的域名即可使用。

## 📖 使用说明

1. **选择语言** - 点击语言选择器切换中英互译方向
2. **选择模式** - 选择"语音+语音"（s2s）或"语音+文字"（s2t）
3. **开始翻译** - 点击"开始"按钮，允许麦克风权限
4. **实时翻译** - 对着麦克风说话，译文会实时显示在屏幕上
5. **查看统计** - 点击统计按钮查看token消耗和费用

## 🏗️ 项目结构

```
s2s/
├── index.html              # 主页面（实时语音翻译）
├── stats.html              # 统计页面（Token统计）
├── assets/
│   ├── style.css          # 样式文件（响应式设计）
│   ├── app.js             # 主页面逻辑
│   └── stats.js           # 统计页面逻辑
├── api/
│   └── auth.js            # Vercel Serverless Function（鉴权API）
├── protos/                # Protobuf定义文件
├── vercel.json            # Vercel配置文件
├── package.json           # 项目依赖
└── README.md              # 项目说明
```

## 🔧 技术栈

- **前端**：原生 HTML/CSS/JavaScript（无框架依赖）
- **后端**：Node.js（Vercel Serverless Functions）
- **通信**：WebSocket + Protobuf
- **音频**：Web Audio API
- **存储**：localStorage（Token统计）

## ⚠️ 重要说明

### WebSocket 鉴权问题

由于浏览器 WebSocket API 不支持自定义 HTTP Headers，本项目需要处理鉴权问题。当前实现方案：

1. **开发环境**：可以通过修改代码直接在前端配置鉴权信息（仅用于开发测试）
2. **生产环境**：建议使用 WebSocket 代理服务器，或者使用支持自定义 Headers 的 WebSocket 库

### Protobuf 处理

项目使用 `protobufjs` 库处理 Protobuf 消息。由于浏览器环境限制，可能需要：

1. 将 `.proto` 文件转换为 JSON 格式
2. 或使用 `protobufjs` 的动态加载功能

当前代码中包含了基本的 Protobuf 处理逻辑，可能需要根据实际情况调整。

## 📊 Token 价格

根据字节跳动官方价格：

- **输入音频Token**：80元/百万Token
- **输出文本Token**：80元/百万Token
- **输出音频Token**：300元/百万Token

费用计算公式：`费用 = (Token数量 / 1,000,000) × 单价`

## 🎨 视觉效果

- **渐变背景** - 动态渐变色彩流动
- **粒子动画** - Canvas粒子系统，跟随鼠标
- **音频波形** - 实时音频频谱可视化
- **打字机效果** - 文字逐字显示
- **流畅动画** - 所有交互都有平滑过渡
- **毛玻璃效果** - 半透明模糊背景

## 📱 响应式设计

- **移动端**：字幕区域占屏幕 60-70%，大字体，触摸友好
- **PC端**：字幕区域占屏幕 40-50%，居中显示
- **自动适配**：根据设备类型自动应用布局，无需用户选择

## 🔒 安全注意事项

- 鉴权信息存储在 Vercel 环境变量中，不会暴露在前端代码
- 生产环境建议添加访问频率限制和IP白名单
- Token统计数据存储在浏览器 localStorage，可随时清除

## 🐛 已知问题

1. WebSocket 鉴权需要特殊处理（见上方说明）
2. Protobuf 消息编码/解码可能需要根据实际API调整
3. 某些浏览器可能对音频格式有不同要求

## 📝 开发计划

- [ ] 完善 Protobuf 消息处理
- [ ] 优化 WebSocket 连接稳定性
- [ ] 添加错误重试机制
- [ ] 支持更多语言对
- [ ] 添加录音历史记录

## 📄 许可证

MIT License

## 🙏 致谢

- 字节跳动 AST 同声传译服务
- Vercel 提供免费托管服务
