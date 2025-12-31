// ===== WebSocket 代理服务器 =====
// 部署到 Railway，用于解决浏览器 WebSocket 无法设置自定义 Headers 的问题
// 同时实现房间管理和消息路由功能

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// 房间管理
const rooms = new Map(); // roomId -> Set<clientId>
const clients = new Map(); // clientId -> { ws, roomId, userId, targetWs }

// 创建 HTTP 服务器
const server = http.createServer();

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ 
    server,
    perMessageDeflate: false // 禁用压缩以提高性能
});

// 处理 WebSocket 连接
wss.on('connection', (clientWs, req) => {
    const parsedUrl = url.parse(req.url, true);
    const query = parsedUrl.query;
    
    // 从 URL 参数获取信息
    const appId = query.appId;
    const accessKey = query.accessKey;
    const roomId = query.roomId;
    const userId = query.userId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`新连接: userId=${userId}, roomId=${roomId}`);
    
    // 验证必需参数
    if (!appId || !accessKey) {
        console.error('缺少鉴权参数');
        clientWs.close(1008, 'Missing auth parameters: appId and accessKey required');
        return;
    }
    
    // 生成客户端ID
    const clientId = `${userId}_${Date.now()}`;
    
    // 连接到字节跳动 AST API
    const targetWs = new WebSocket('wss://openspeech.bytedance.com/api/v4/ast/v2/translate', {
        headers: {
            'X-Api-App-Key': appId,
            'X-Api-Access-Key': accessKey,
            'X-Api-Resource-Id': 'volc.service_type.10053'
        }
    });
    
    // 存储客户端信息
    clients.set(clientId, {
        ws: clientWs,
        roomId: roomId || null,
        userId: userId,
        targetWs: targetWs
    });
    
    // 如果提供了房间ID，加入房间
    if (roomId) {
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        rooms.get(roomId).add(clientId);
        console.log(`用户 ${userId} 加入房间 ${roomId}`);
        
        // 通知房间内其他用户
        broadcastToRoom(roomId, clientId, {
            type: 'user_joined',
            userId: userId,
            timestamp: Date.now()
        });
    }
    
    // 浏览器 -> 字节跳动 API（转发音频数据）
    clientWs.on('message', (data) => {
        console.log(`[${userId}] 收到客户端消息, 大小: ${data.length} bytes, targetWs状态: ${targetWs.readyState}`);
        if (targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(data);
            console.log(`[${userId}] 已转发到字节跳动API`);
        } else {
            console.error(`[${userId}] 无法转发: targetWs 未连接 (状态: ${targetWs.readyState})`);
        }
    });
    
    // 字节跳动 API -> 浏览器（转发翻译结果）
    targetWs.on('message', (data) => {
        console.log(`[${userId}] 收到字节跳动API响应, 大小: ${data.length} bytes`);
        if (clientWs.readyState === WebSocket.OPEN) {
            // 直接转发给客户端
            clientWs.send(data);
            
            // 如果用户在房间中，也转发给房间内其他用户
            if (roomId) {
                try {
                    // 尝试解析消息（可能是Protobuf二进制）
                    // 这里我们直接转发二进制数据给房间内其他用户
                    broadcastToRoom(roomId, clientId, {
                        type: 'translation',
                        fromUserId: userId,
                        data: data.toString('base64'), // 转换为base64以便JSON传输
                        timestamp: Date.now()
                    });
                } catch (error) {
                    console.error('转发消息失败:', error);
                }
            }
        }
    });
    
    // 连接成功
    targetWs.on('open', () => {
        console.log(`[${userId}] ✅ 已成功连接到字节跳动API`);
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
                type: 'connected',
                message: 'Connected to translation service'
            }));
        }
    });
    
    // 错误处理
    clientWs.on('error', (error) => {
        console.error(`[${userId}] 客户端错误:`, error.message || error);
        cleanupClient(clientId);
    });
    
    targetWs.on('error', (error) => {
        console.error(`[${userId}] ❌ 字节跳动API连接错误:`, error.message || error);
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
                type: 'error',
                message: `Translation service error: ${error.message || 'Unknown error'}`
            }));
        }
        cleanupClient(clientId);
    });
    
    // 连接关闭
    clientWs.on('close', () => {
        console.log(`客户端 ${userId} 断开连接`);
        cleanupClient(clientId);
    });
    
    targetWs.on('close', (code, reason) => {
        console.log(`[${userId}] 字节跳动API连接关闭, code: ${code}, reason: ${reason?.toString() || '无'}`);
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
                type: 'error',
                message: `字节跳动API连接关闭 (code: ${code})`,
                code: code
            }));
        }
        cleanupClient(clientId);
    });
    
    // 心跳检测
    const pingInterval = setInterval(() => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.ping();
        } else {
            clearInterval(pingInterval);
        }
    }, 30000); // 30秒心跳
    
    clientWs.on('pong', () => {
        // 收到pong响应
    });
});

// 广播消息到房间内其他用户
function broadcastToRoom(roomId, excludeClientId, message) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    room.forEach(clientId => {
        if (clientId !== excludeClientId) {
            const client = clients.get(clientId);
            if (client && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify(message));
            }
        }
    });
}

// 清理客户端
function cleanupClient(clientId) {
    const client = clients.get(clientId);
    if (!client) return;
    
    // 从房间中移除
    if (client.roomId) {
        const room = rooms.get(client.roomId);
        if (room) {
            room.delete(clientId);
            
            // 通知房间内其他用户
            broadcastToRoom(client.roomId, clientId, {
                type: 'user_left',
                userId: client.userId,
                timestamp: Date.now()
            });
            
            // 如果房间为空，删除房间
            if (room.size === 0) {
                rooms.delete(client.roomId);
            }
        }
    }
    
    // 关闭连接
    if (client.targetWs) {
        client.targetWs.close();
    }
    
    // 从客户端列表中移除
    clients.delete(clientId);
}

// 健康检查端点
server.on('request', (req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            rooms: rooms.size,
            clients: clients.size,
            timestamp: Date.now()
        }));
        return;
    }
    
    // 其他请求返回404
    res.writeHead(404);
    res.end('Not Found');
});

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`WebSocket代理服务器运行在端口 ${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在关闭服务器...');
    wss.close(() => {
        server.close(() => {
            console.log('服务器已关闭');
            process.exit(0);
        });
    });
});
