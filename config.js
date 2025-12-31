// ===== 配置文件 =====
// 部署时需要配置Railway WebSocket代理服务器URL

// Railway WebSocket代理服务器URL
// 部署后，将 'wss://your-app.railway.app' 替换为你的实际Railway URL
window.WS_PROXY_URL = window.WS_PROXY_URL || 'wss://your-app.railway.app';

// 如果需要从环境变量读取（Vercel）
// 可以在index.html中通过script标签设置：
// <script>
//   window.WS_PROXY_URL = '<%= process.env.WS_PROXY_URL %>';
// </script>

console.log('WebSocket代理服务器URL:', window.WS_PROXY_URL);

