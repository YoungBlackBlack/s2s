// ===== 配置文件 =====
// Render WebSocket代理服务器URL（已配置）

// Render WebSocket代理服务器URL
// 当前配置：wss://s2s-dxla.onrender.com
window.WS_PROXY_URL = window.WS_PROXY_URL || 'wss://s2s-dxla.onrender.com';

// 如果需要从环境变量读取（Vercel）
// 可以在index.html中通过script标签设置：
// <script>
//   window.WS_PROXY_URL = '<%= process.env.WS_PROXY_URL %>';
// </script>

console.log('WebSocket代理服务器URL:', window.WS_PROXY_URL);

