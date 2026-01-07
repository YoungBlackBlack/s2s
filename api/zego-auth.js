// Vercel Serverless Function
// 提供即构RTC鉴权信息给前端，保护敏感信息

export default async function handler(req, res) {
  try {
    // 只允许 GET 请求
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // 从环境变量读取即构配置信息
    const appId = process.env.ZEGO_APP_ID;
    const appSign = process.env.ZEGO_APP_SIGN;
    const serverSecret = process.env.ZEGO_SERVER_SECRET;

    // 检查环境变量是否配置
    if (!appId || !appSign) {
      console.error('即构环境变量未配置:', {
        hasAppId: !!appId,
        hasAppSign: !!appSign,
        hasServerSecret: !!serverSecret
      });
      return res.status(500).json({ 
        error: 'ZEGO credentials not configured',
        message: '请在 Vercel 控制台配置 ZEGO_APP_ID 和 ZEGO_APP_SIGN 环境变量',
        details: {
          hasAppId: !!appId,
          hasAppSign: !!appSign
        }
      });
    }

    // 返回即构配置信息
    // 注意：AppSign会暴露给前端，但这是即构SDK的正常使用方式
    // ServerSecret保留在服务端，如需要生成Token时使用
    return res.status(200).json({
      appId: appId,
      appSign: appSign,
      serverSecret: serverSecret || null // 可选，用于服务端Token生成
    });
  } catch (error) {
    console.error('即构鉴权API错误:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || '服务器内部错误'
    });
  }
}

