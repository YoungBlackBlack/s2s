// ===== 即构RTC完整测试脚本 =====
// 在浏览器控制台（F12）中执行此脚本进行测试

(async function testZegoRTC() {
    console.log('🚀 开始即构RTC完整测试...\n');
    
    const results = {
        api: false,
        sdk: false,
        connection: false,
        audio: false,
        translation: false
    };
    
    // ===== 测试1: API端点测试 =====
    console.log('📡 测试1: 即构鉴权API');
    try {
        const response = await fetch('/api/zego-auth');
        const data = await response.json();
        
        if (response.ok && data.appId && data.appSign) {
            console.log('✅ API测试成功');
            console.log('   AppID:', data.appId);
            console.log('   AppSign:', data.appSign.substring(0, 20) + '...');
            console.log('   ServerSecret:', data.serverSecret ? '已配置' : '未配置');
            results.api = true;
            window.zegoConfig = data; // 保存配置供后续使用
        } else {
            console.error('❌ API测试失败:', data.message || '未知错误');
            console.error('   响应数据:', data);
        }
    } catch (error) {
        console.error('❌ API请求失败:', error.message);
    }
    console.log('');
    
    // ===== 测试2: SDK加载测试 =====
    console.log('📦 测试2: SDK加载检查');
    const zegoSDKLoaded = typeof ZegoExpressEngine !== 'undefined';
    const protobufLoaded = typeof protobuf !== 'undefined';
    
    if (zegoSDKLoaded) {
        console.log('✅ 即构SDK已加载');
        results.sdk = true;
    } else {
        console.error('❌ 即构SDK未加载，请检查CDN链接');
    }
    
    if (protobufLoaded) {
        console.log('✅ Protobuf库已加载');
    } else {
        console.error('❌ Protobuf库未加载');
    }
    console.log('');
    
    // ===== 测试3: 检查当前状态 =====
    console.log('🔍 测试3: 检查当前应用状态');
    console.log('   即构引擎:', typeof zegoEngine !== 'undefined' && zegoEngine ? '✅ 已初始化' : '❌ 未初始化');
    console.log('   房间ID:', typeof currentRoomId !== 'undefined' ? currentRoomId : '未设置');
    console.log('   用户ID:', typeof userInfo !== 'undefined' && userInfo ? userInfo.userId : '未设置');
    console.log('   录音状态:', typeof isRecording !== 'undefined' && isRecording ? '✅ 正在录音' : '❌ 未录音');
    console.log('');
    
    // ===== 测试4: 即构RTC连接测试（如果已初始化）=====
    if (typeof zegoEngine !== 'undefined' && zegoEngine) {
        console.log('🔗 测试4: 即构RTC连接状态');
        console.log('   引擎状态: ✅ 已创建');
        console.log('   房间ID:', typeof zegoRoomId !== 'undefined' ? zegoRoomId : '未设置');
        console.log('   流ID:', typeof zegoStreamId !== 'undefined' ? zegoStreamId : '未设置');
        results.connection = true;
    } else {
        console.log('⚠️  即构RTC未初始化，请先点击"开始"按钮');
    }
    console.log('');
    
    // ===== 测试5: 音频流状态 =====
    if (typeof mediaStream !== 'undefined' && mediaStream) {
        console.log('🎤 测试5: 音频流状态');
        const tracks = mediaStream.getTracks();
        console.log('   音频轨道数:', tracks.length);
        tracks.forEach((track, index) => {
            console.log(`   轨道${index + 1}:`, track.enabled ? '✅ 启用' : '❌ 禁用', track.kind, track.readyState);
        });
        results.audio = true;
    } else {
        console.log('⚠️  音频流未获取，请先点击"开始"按钮');
    }
    console.log('');
    
    // ===== 测试6: 翻译功能检查 =====
    console.log('🌐 测试6: 翻译功能检查');
    console.log('   字节跳动API:', typeof ws !== 'undefined' && ws ? 
        (ws.readyState === WebSocket.OPEN ? '✅ 已连接' : `状态: ${ws.readyState}`) : '❌ 未连接');
    console.log('   会话ID:', typeof currentSessionId !== 'undefined' ? currentSessionId : '未设置');
    console.log('   源语言:', typeof sourceLanguage !== 'undefined' ? sourceLanguage : '未设置');
    console.log('   目标语言:', typeof targetLanguage !== 'undefined' ? targetLanguage : '未设置');
    console.log('   模式:', typeof mode !== 'undefined' ? mode : '未设置');
    console.log('');
    
    // ===== 测试总结 =====
    console.log('📊 测试总结:');
    console.log('   API端点:', results.api ? '✅' : '❌');
    console.log('   SDK加载:', results.sdk ? '✅' : '❌');
    console.log('   RTC连接:', results.connection ? '✅' : '⚠️  需要先启动录音');
    console.log('   音频流:', results.audio ? '✅' : '⚠️  需要先启动录音');
    console.log('');
    
    // ===== 提供下一步建议 =====
    if (!results.api) {
        console.log('💡 建议: 检查Vercel环境变量配置');
    }
    if (!results.sdk) {
        console.log('💡 建议: 检查index.html中的SDK CDN链接');
    }
    if (results.api && results.sdk && !results.connection) {
        console.log('💡 建议: 点击"开始"按钮启动录音，系统会自动初始化即构RTC');
    }
    if (results.connection && results.audio) {
        console.log('💡 建议: 现在可以测试双用户房间功能');
        console.log('   1. 打开另一个浏览器窗口（无痕模式）');
        console.log('   2. 设置相同的房间ID');
        console.log('   3. 测试P2P音频传输和翻译广播');
    }
    
    console.log('\n✨ 测试完成！');
    
    return results;
})();

