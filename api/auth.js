// Vercel Serverless Function
// 提供鉴权信息给前端，保护敏感信息

module.exports = async function handler(req, res) {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 从环境变量读取鉴权信息
  const appId = process.env.APP_ID;
  const accessToken = process.env.ACCESS_TOKEN || process.env.ACCESS_KEY; // 支持两种命名，ACCESS_TOKEN是正确名称

  // 检查环境变量是否配置
  if (!appId || !accessToken) {
    return res.status(500).json({ 
      error: 'Authentication credentials not configured',
      message: '请在 Vercel 控制台配置 APP_ID 和 ACCESS_TOKEN 环境变量'
    });
  }

  // 返回鉴权信息
  // 注意：在生产环境中，可以考虑添加额外的安全措施
  // 比如：IP白名单、访问频率限制等
  return res.status(200).json({
    appId: appId,
    accessKey: accessToken, // 前端使用accessKey字段名
    resourceId: 'volc.service_type.10053' // 固定值
  });
};

