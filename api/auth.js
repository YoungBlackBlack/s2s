// Vercel Serverless Function
// 提供鉴权信息给前端，保护敏感信息

export default async function handler(req, res) {
  try {
    // 只允许 GET 请求
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // 从环境变量读取鉴权信息（支持多种命名格式）
    const appId = process.env.APP_ID;
    const accessToken = process.env.ACCESS_TOKEN || process.env.Access_Token || process.env.ACCESS_KEY; // 支持多种命名格式

    // 检查环境变量是否配置
    if (!appId || !accessToken) {
      console.error('环境变量未配置:', {
        hasAppId: !!appId,
        hasAccessToken: !!accessToken,
        hasAccessKey: !!process.env.ACCESS_KEY
      });
      return res.status(500).json({ 
        error: 'Authentication credentials not configured',
        message: '请在 Vercel 控制台配置 APP_ID 和 ACCESS_TOKEN 环境变量',
        details: {
          hasAppId: !!appId,
          hasAccessToken: !!accessToken
        }
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
  } catch (error) {
    console.error('API 错误:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || '服务器内部错误'
    });
  }
}

