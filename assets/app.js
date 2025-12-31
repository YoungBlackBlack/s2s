// ===== 同声传译 Demo - 主应用逻辑 =====

// 全局变量
// protobuf 由 CDN 加载（window.protobuf），不要重新声明
let root = null;
let ws = null;
let audioContext = null;
let analyser = null;
let mediaStream = null;
let isRecording = false;
let currentSessionId = null;
let sourceLanguage = 'zh';
let targetLanguage = 'en';
let mode = 's2s';

// 用户和房间信息
let userInfo = null;
let currentRoomId = null;
let wsProxyUrl = null; // Railway WebSocket代理服务器URL

// 字幕管理器（区分我的和对方的）
// 流式显示：像 ChatGPT 一样逐字出现，同一句在一行
const mySubtitleManager = {
    container: null,
    currentItem: null,
    currentText: '',
    history: [],
    maxHistory: 3,
    lastUpdateTime: 0,
    finishTimeout: null,
    
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (this.container) {
            this.container.innerHTML = '';
        }
    },
    
    // 流式追加文字（主要方法）
    appendText(text) {
        if (!this.container || !text) return;
        
        const now = Date.now();
        
        // 如果距离上次更新超过 2 秒，认为是新句子
        if (now - this.lastUpdateTime > 2000 && this.currentText) {
            this.finishCurrentSentence();
        }
        
        this.lastUpdateTime = now;
        
        // 清除之前的完成定时器
        if (this.finishTimeout) {
            clearTimeout(this.finishTimeout);
        }
        
        // 追加文字
        this.currentText += text;
        
        // 创建或更新当前字幕元素
        if (!this.currentItem) {
            const item = document.createElement('div');
            item.className = 'subtitle-item current';
            this.container.appendChild(item);
            this.currentItem = item;
        }
        
        // 显示当前文字 + 加载指示器
        this.currentItem.innerHTML = this.currentText + '<span class="typing-cursor">...</span>';
        
        // 设置自动完成定时器（1.5秒没有新文字就认为句子结束）
        this.finishTimeout = setTimeout(() => {
            this.finishCurrentSentence();
        }, 1500);
    },
    
    // 完成当前句子，移到历史
    finishCurrentSentence() {
        if (!this.currentItem || !this.currentText) return;
        
        // 移除加载指示器
        this.currentItem.textContent = this.currentText;
        this.currentItem.classList.remove('current');
        this.currentItem.classList.add('history');
        this.history.push(this.currentItem);
        
        // 限制历史数量
        while (this.history.length > this.maxHistory) {
            const old = this.history.shift();
            if (old && old.parentNode) {
                old.remove();
            }
        }
        
        // 重置当前状态
        this.currentItem = null;
        this.currentText = '';
        
        if (this.finishTimeout) {
            clearTimeout(this.finishTimeout);
            this.finishTimeout = null;
        }
    },
    
    // 兼容旧接口
    addSubtitle(text) {
        this.appendText(text);
    },
    
    updateSubtitle(text) {
        this.appendText(text);
    },
    
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.currentItem = null;
        this.currentText = '';
        this.history = [];
        if (this.finishTimeout) {
            clearTimeout(this.finishTimeout);
            this.finishTimeout = null;
        }
    }
};

const otherSubtitleManager = {
    container: null,
    currentItem: null,
    currentText: '',
    history: [],
    maxHistory: 3,
    lastUpdateTime: 0,
    finishTimeout: null,
    
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (this.container) {
            this.container.innerHTML = '';
        }
    },
    
    appendText(text) {
        if (!this.container || !text) return;
        
        const now = Date.now();
        
        if (now - this.lastUpdateTime > 2000 && this.currentText) {
            this.finishCurrentSentence();
        }
        
        this.lastUpdateTime = now;
        
        if (this.finishTimeout) {
            clearTimeout(this.finishTimeout);
        }
        
        this.currentText += text;
        
        if (!this.currentItem) {
            const item = document.createElement('div');
            item.className = 'subtitle-item current';
            this.container.appendChild(item);
            this.currentItem = item;
        }
        
        this.currentItem.innerHTML = this.currentText + '<span class="typing-cursor">...</span>';
        
        this.finishTimeout = setTimeout(() => {
            this.finishCurrentSentence();
        }, 1500);
    },
    
    finishCurrentSentence() {
        if (!this.currentItem || !this.currentText) return;
        
        this.currentItem.textContent = this.currentText;
        this.currentItem.classList.remove('current');
        this.currentItem.classList.add('history');
        this.history.push(this.currentItem);
        
        while (this.history.length > this.maxHistory) {
            const old = this.history.shift();
            if (old && old.parentNode) {
                old.remove();
            }
        }
        
        this.currentItem = null;
        this.currentText = '';
        
        if (this.finishTimeout) {
            clearTimeout(this.finishTimeout);
            this.finishTimeout = null;
        }
    },
    
    addSubtitle(text) {
        this.appendText(text);
    },
    
    updateSubtitle(text) {
        this.appendText(text);
    },
    
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.currentItem = null;
        this.currentText = '';
        this.history = [];
        if (this.finishTimeout) {
            clearTimeout(this.finishTimeout);
            this.finishTimeout = null;
        }
    }
};

// Token统计
const tokenStats = {
    current: {
        input_audio_tokens: 0,
        output_text_tokens: 0,
        output_audio_tokens: 0
    },
    total: {
        input_audio_tokens: 0,
        output_text_tokens: 0,
        output_audio_tokens: 0
    }
};

// Token单价（元/百万Token）
const TOKEN_PRICES = {
    input: 80,
    output_text: 80,
    output_audio: 300
};

// 字幕管理器（通用函数）
function createSubtitleManager(containerId) {
    return {
        container: null,
        items: [],
        maxItems: 5,
        
        init(containerId) {
            this.container = document.getElementById(containerId);
        },
        
        addSubtitle(text) {
            if (!this.container) return;
            
            // 创建新字幕项
            const item = document.createElement('div');
            item.className = 'subtitle-item active';
            const textEl = document.createElement('div');
            textEl.className = 'subtitle-text';
            item.appendChild(textEl);
            
            // 添加到容器
            this.container.appendChild(item);
            this.items.push(item);
            
            // 打字机效果显示文字
            this.typewriter(textEl, text);
            
            // 如果超过最大数量，移除最旧的
            if (this.items.length > this.maxItems) {
                const oldItem = this.items.shift();
                oldItem.classList.add('fade-out');
                setTimeout(() => oldItem.remove(), 500);
            }
            
            // 滚动效果：新字幕出现，旧字幕上移
            this.items.forEach((el, index) => {
                if (index < this.items.length - 1) {
                    el.style.transform = `translateY(-${(this.items.length - index - 1) * 20}px)`;
                    el.style.opacity = Math.max(0.3, 1 - (this.items.length - index - 1) * 0.2);
                }
            });
        },
        
        typewriter(element, text, speed = 30) {
            let index = 0;
            element.textContent = '';
            
            const timer = setInterval(() => {
                if (index < text.length) {
                    element.textContent += text[index];
                    index++;
                } else {
                    clearInterval(timer);
                }
            }, speed);
        },
        
        clear() {
            this.items.forEach(item => {
                item.classList.add('fade-out');
                setTimeout(() => item.remove(), 500);
            });
            this.items = [];
        }
    };
}

// ===== 初始化 =====
async function init() {
    try {
        // 检查登录状态
        const savedUserInfo = localStorage.getItem('userInfo');
        if (!savedUserInfo) {
            window.location.href = 'login.html';
            return;
        }
        userInfo = JSON.parse(savedUserInfo);
        
        // 获取房间ID
        currentRoomId = sessionStorage.getItem('currentRoomId');
        if (!currentRoomId) {
            window.location.href = 'room.html';
            return;
        }
        
        // 获取Railway代理服务器URL（从环境变量或配置）
        // 注意：部署时需要配置这个URL
        wsProxyUrl = window.WS_PROXY_URL || 'wss://your-app.railway.app';
        
        // 显示用户信息
        const userNameEl = document.getElementById('userNameHeader');
        if (userNameEl) {
            userNameEl.textContent = userInfo.username;
        }
        
        // 显示房间信息
        const roomIdDisplay = document.getElementById('roomIdDisplay');
        if (roomIdDisplay) {
            roomIdDisplay.textContent = currentRoomId;
        }
        
        // 初始化字幕管理器
        mySubtitleManager.init('mySubtitles');
        otherSubtitleManager.init('otherSubtitles');
        
        // 加载Protobuf定义
        await loadProtobuf();
        
        // 加载Token统计数据
        loadTokenStats();
        
        // 绑定事件
        bindEvents();
        
        // 初始化粒子动画
        initParticles();
        
        // 初始化音频波形
        initWaveform();
        
        updateStatus('准备就绪', 'ready');
    } catch (error) {
        console.error('初始化失败:', error);
        updateStatus('初始化失败: ' + error.message, 'error');
    }
}

// ===== 加载Protobuf定义 =====
async function loadProtobuf() {
    try {
        // 优先尝试加载预构建的 JSON 格式（性能更好，单次请求）
        const response = await fetch('/assets/protos/bundle.json');
        if (response.ok) {
            const json = await response.json();
            root = protobuf.Root.fromJSON(json);
            console.log('✅ Protobuf (JSON) 加载成功');
            return;
        } else {
            console.warn('⚠️ 无法加载 bundle.json，尝试动态加载 .proto 文件');
        }
        
        // 如果 JSON 加载失败，回退到动态加载 .proto 文件（使用绝对路径）
        root = await protobuf.load([
            '/protos/common/events.proto',
            '/protos/common/rpcmeta.proto',
            '/protos/products/understanding/base/au_base.proto',
            '/protos/products/understanding/ast/ast_service.proto'
        ]);
        root.resolveAll();
        console.log('✅ Protobuf (.proto) 加载成功');
    } catch (error) {
        console.error('❌ Protobuf 加载失败:', error);
        console.warn('⚠️ 将使用 JSON 格式发送消息（可能无法正常工作）');
        console.warn('💡 提示：请运行 npm run build-protos 生成 bundle.json 文件');
        root = null;
    }
}

// ===== 事件绑定 =====
function bindEvents() {
    // 语言选择
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sourceLanguage = btn.dataset.lang;
            targetLanguage = btn.dataset.target;
            
            // 如果正在录音，需要重新连接
            if (isRecording) {
                stopRecording();
                setTimeout(() => startRecording(), 500);
            }
        });
    });
    
    // 模式选择
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mode = btn.dataset.mode;
            
            if (isRecording) {
                stopRecording();
                setTimeout(() => startRecording(), 500);
            }
        });
    });
    
    // 录音按钮
    document.getElementById('recordBtn').addEventListener('click', () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });
    
    // 统计按钮
    document.getElementById('statsBtn').addEventListener('click', () => {
        window.location.href = 'stats.html';
    });
}

// ===== 开始录音 =====
async function startRecording() {
    try {
        updateStatus('正在连接...', 'connecting');
        
        // 获取鉴权信息
        const response = await fetch('/api/auth');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `获取鉴权信息失败 (${response.status})`);
        }
        const auth = await response.json();
        if (!auth.appId || !auth.accessKey) {
            throw new Error(auth.message || '鉴权信息获取失败：环境变量未配置');
        }
        
        // 创建WebSocket连接
        await connectWebSocket(auth);
        
        // 获取麦克风权限
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
            }
        });
        
        // 创建AudioContext
        audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000
        });
        
        const source = audioContext.createMediaStreamSource(mediaStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        
        // 开始发送音频数据
        isRecording = true;
        document.getElementById('recordBtn').classList.add('recording');
        document.getElementById('recordBtn').querySelector('.btn-text').textContent = '停止';
        updateStatus('正在录音...', 'recording');
        
        // 启动音频采集
        startAudioCapture();
        
        // 启动波形可视化
        startWaveform();
        
    } catch (error) {
        console.error('开始录音失败:', error);
        updateStatus('错误: ' + error.message, 'error');
        isRecording = false;
    }
}

// ===== 停止录音 =====
function stopRecording() {
    isRecording = false;
    
    // 停止音频流
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    
    // 关闭AudioContext
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    
    // 发送结束消息
    if (ws && ws.readyState === WebSocket.OPEN) {
        sendFinishSession();
        ws.close();
    }
    
    // 更新UI
    document.getElementById('recordBtn').classList.remove('recording');
    document.getElementById('recordBtn').querySelector('.btn-text').textContent = '开始';
    document.getElementById('waveform-canvas').classList.remove('active');
    updateStatus('已停止', 'ready');
}

// ===== WebSocket连接 =====
// 使用Railway代理服务器连接
async function connectWebSocket(auth) {
    return new Promise((resolve, reject) => {
        if (!wsProxyUrl || wsProxyUrl === 'wss://your-app.railway.app') {
            reject(new Error('请配置Railway WebSocket代理服务器URL'));
            return;
        }
        
        // 构建连接URL（通过URL参数传递鉴权信息和房间信息）
        const wsUrl = `${wsProxyUrl}?appId=${encodeURIComponent(auth.appId)}&accessKey=${encodeURIComponent(auth.accessKey)}&roomId=${encodeURIComponent(currentRoomId)}&userId=${encodeURIComponent(userInfo.userId)}`;
        
        console.log('连接到Railway代理服务器:', wsProxyUrl);
        
        ws = new WebSocket(wsUrl);
        
        ws.binaryType = 'arraybuffer';
        
        let isResolved = false;
        
        ws.onopen = () => {
            console.log('WebSocket连接成功（通过Railway代理）');
            updateStatus('等待翻译服务连接...', 'connecting');
            // 注意：不要在这里发送 StartSession，等待代理服务器确认连接到字节跳动API后再发送
        };
        
        ws.onmessage = (event) => {
            // 检查是否是JSON消息（来自代理服务器的房间消息）
            try {
                // 对于 ArrayBuffer，需要先转换为字符串
                let text;
                if (event.data instanceof ArrayBuffer) {
                    text = new TextDecoder().decode(event.data);
                } else {
                    text = event.data.toString();
                }
                
                if (text.startsWith('{')) {
                    const message = JSON.parse(text);
                    
                    // 处理 'connected' 消息 - 代理服务器已连接到字节跳动API
                    if (message.type === 'connected' && !isResolved) {
                        console.log('✅ 代理服务器已连接到字节跳动API');
                        updateStatus('已连接', 'connected');
                        updateRoomStatus('已连接', true);
                        
                        // 现在才发送 StartSession
                        sendStartSession();
                        isResolved = true;
                        resolve();
                        return;
                    }
                    
                    // 处理错误消息
                    if (message.type === 'error') {
                        console.error('❌ 代理服务器错误:', message.message);
                        updateStatus('连接错误: ' + message.message, 'error');
                        if (!isResolved) {
                            isResolved = true;
                            reject(new Error(message.message));
                        }
                        return;
                    }
                    
                    handleRoomMessage(message);
                    return;
                }
            } catch (e) {
                // 不是JSON，继续处理为Protobuf消息
            }
            
            // 处理Protobuf消息（来自字节跳动API的翻译结果）
            handleWebSocketMessage(event.data);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket错误:', error);
            updateStatus('连接错误', 'error');
            reject(error);
        };
        
        ws.onclose = () => {
            console.log('WebSocket连接关闭');
            if (isRecording) {
                updateStatus('连接断开', 'error');
            }
        };
    });
}

// ===== 发送建连请求 =====
function sendStartSession() {
    currentSessionId = generateUUID();
    
    // 构建StartSession消息（符合Protobuf定义，使用驼峰命名）
    const message = {
        requestMeta: {
            SessionID: currentSessionId
        },
        event: 100, // StartSession (event.Type.StartSession)
        sourceAudio: {
            format: 'wav',
            codec: 'raw',
            rate: 16000,
            bits: 16,
            channel: 1
        },
        targetAudio: mode === 's2s' ? {
            format: 'pcm',
            rate: 24000
        } : undefined,
        request: {
            mode: mode, // 's2s' or 's2t'
            sourceLanguage: sourceLanguage, // 'zh' or 'en'
            targetLanguage: targetLanguage  // 'en' or 'zh'
        }
    };
    
    console.log('📤 发送 StartSession:', message);
    // 发送消息（需要Protobuf编码）
    sendProtobufMessage(message, 100);
}

// ===== 发送音频数据 =====
function sendAudioData(audioData) {
    if (!ws || ws.readyState !== WebSocket.OPEN || !isRecording) {
        return;
    }
    
    // 构建TaskRequest消息（符合Protobuf定义，使用驼峰命名）
    // audioData 是 ArrayBuffer，需要转换为 Uint8Array
    const uint8Array = new Uint8Array(audioData);
    
    const message = {
        event: 200, // TaskRequest (event.Type.TaskRequest)
        sourceAudio: {
            binaryData: uint8Array // 使用 binaryData 字段（bytes类型），需要 Uint8Array
        }
    };
    
    sendProtobufMessage(message, 200);
}

// ===== 发送结束会话 =====
function sendFinishSession() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
    }
    
    const message = {
        event: 102 // FinishSession
    };
    
    sendProtobufMessage(message, 102);
}

// ===== 发送Protobuf消息 =====
function sendProtobufMessage(message, eventType) {
    try {
        if (!root) {
            console.error('❌ Protobuf 未加载，无法发送消息');
            updateStatus('错误：Protobuf 未加载，请刷新页面重试', 'error');
            return;
        }
        
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn('⚠️ WebSocket 未连接，跳过消息发送');
            return;
        }
        
        // 使用Protobuf编码
        const TranslateRequest = root.lookupType('data.speech.ast.TranslateRequest');
        if (!TranslateRequest) {
            console.error('❌ 找不到 TranslateRequest 类型定义');
            console.log('可用的类型:', root.nested);
            throw new Error('找不到 TranslateRequest 类型定义');
        }
        
        // 验证消息（允许部分字段缺失）
        const errMsg = TranslateRequest.verify(message);
        if (errMsg) {
            console.warn('⚠️ 消息验证警告:', errMsg);
            // 不抛出错误，继续尝试编码
        }
        
        // 编码消息
        const buffer = TranslateRequest.encode(message).finish();
        ws.send(buffer);
        
        // 只在调试时输出日志，避免频繁输出
        if (eventType === 100) { // StartSession
            console.log('✅ StartSession 消息发送成功');
        }
    } catch (error) {
        console.error('❌ 发送消息失败:', error);
        console.error('消息内容:', message);
        // 不更新状态，避免频繁弹窗
        // updateStatus('发送消息失败: ' + error.message, 'error');
    }
}

// ===== 解析Protobuf消息 =====
function parseProtobufMessage(data) {
    try {
        if (root) {
            // 使用Protobuf解码
            const TranslateResponse = root.lookupType('data.speech.ast.TranslateResponse');
            const message = TranslateResponse.decode(new Uint8Array(data));
            return TranslateResponse.toObject(message, {
                longs: String,
                enums: String,
                bytes: String,
                defaults: true,
                arrays: true,
                objects: true,
                oneofs: true
            });
        } else {
            // 临时方案：尝试解析为JSON
            try {
                const decoder = new TextDecoder();
                const jsonStr = decoder.decode(data);
                return JSON.parse(jsonStr);
            } catch (e) {
                console.error('无法解析消息');
                return null;
            }
        }
    } catch (error) {
        console.error('解析Protobuf消息失败:', error);
        return null;
    }
}

// ===== 处理WebSocket消息 =====
function handleWebSocketMessage(data) {
    try {
        const message = parseProtobufMessage(data);
        if (!message) return;
        
        // 事件类型可能是数字或字符串（取决于 Protobuf 解析方式）
        const eventType = message.event;
        console.log('📩 收到消息, event:', eventType, message);
        
        // 支持数字和字符串两种事件类型格式
        const isEvent = (type, num, str) => eventType === num || eventType === str;
        
        if (isEvent(eventType, 150, 'SessionStarted')) {
            console.log('✅ 会话已开始');
            updateStatus('会话已开始，请说话...', 'recording');
        }
        else if (isEvent(eventType, 651, 'SourceSubtitleResponse')) {
            // 原文字幕
            if (message.text) {
                console.log('🎤 原文:', message.text);
            }
        }
        else if (isEvent(eventType, 654, 'TranslationSubtitleResponse')) {
            // 译文字幕（我的翻译）
            if (message.text) {
                console.log('🌐 我的译文:', message.text);
                mySubtitleManager.appendText(message.text);
            }
        }
        else if (isEvent(eventType, 352, 'TTSResponse')) {
            // 语音合成结果
            if (message.data) {
                console.log('🔊 收到语音数据, 长度:', message.data.length);
                playAudio(message.data);
            }
        }
        else if (isEvent(eventType, 154, 'UsageResponse') || isEvent(eventType, 154, 'ChargeData')) {
            handleUsageResponse(message);
        }
        else if (isEvent(eventType, 152, 'SessionFinished')) {
            console.log('✅ 会话已结束');
        }
        else if (isEvent(eventType, 153, 'SessionFailed')) {
            console.error('❌ 会话失败:', message.responseMeta?.Message);
            updateStatus('会话失败: ' + (message.responseMeta?.Message || '未知错误'), 'error');
        }
        else {
            console.log('📨 其他事件:', eventType);
        }
    } catch (error) {
        console.error('处理消息失败:', error);
    }
}

// ===== 处理用量响应 =====
function handleUsageResponse(message) {
    // 使用驼峰命名字段 (responseMeta, Billing, Items)
    if (message.responseMeta?.Billing?.Items) {
        message.responseMeta.Billing.Items.forEach(item => {
            const unit = item.Unit;
            const quantity = item.Quantity;
            
            if (unit === 'input_audio_tokens') {
                tokenStats.current.input_audio_tokens += quantity;
                tokenStats.total.input_audio_tokens += quantity;
            } else if (unit === 'output_text_tokens') {
                tokenStats.current.output_text_tokens += quantity;
                tokenStats.total.output_text_tokens += quantity;
            } else if (unit === 'output_audio_tokens') {
                tokenStats.current.output_audio_tokens += quantity;
                tokenStats.total.output_audio_tokens += quantity;
            }
        });
        
        // 保存到localStorage
        saveTokenStats();
    }
}

// ===== 音频采集 =====
function startAudioCapture() {
    if (!audioContext || !analyser) return;
    
    const bufferSize = 2560; // 160ms at 16kHz (16000 * 0.16 = 2560 samples)
    const audioBuffer = new Float32Array(bufferSize);
    let audioBufferIndex = 0;
    
    const processAudio = () => {
        if (!isRecording || !analyser) return;
        
        const dataArray = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatTimeDomainData(dataArray);
        
        // 收集音频数据
        for (let i = 0; i < dataArray.length && audioBufferIndex < bufferSize; i++) {
            audioBuffer[audioBufferIndex++] = dataArray[i];
        }
        
        // 当缓冲区满时，转换为PCM并发送
        if (audioBufferIndex >= bufferSize) {
            const pcmData = convertToPCM(audioBuffer);
            sendAudioData(pcmData);
            audioBufferIndex = 0;
        }
        
        requestAnimationFrame(processAudio);
    };
    
    processAudio();
}

// ===== 转换为PCM格式 =====
function convertToPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        // 将-1.0到1.0的浮点数转换为-32768到32767的整数
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array.buffer;
}

// ===== 流式音频播放器 =====
// 字节跳动 TTS 返回的是 16-bit PCM 24kHz 单声道
const audioPlayer = {
    context: null,
    buffer: [],           // 原始音频数据缓冲
    isPlaying: false,
    nextPlayTime: 0,      // 下一个音频块应该播放的时间
    sampleRate: 24000,
    minBufferSize: 4800,  // 最小缓冲：0.1秒的数据（24000 * 0.1 * 2 bytes）
    
    init() {
        if (!this.context || this.context.state === 'closed') {
            this.context = new AudioContext({ sampleRate: this.sampleRate });
        }
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
    },
    
    // 添加音频数据到缓冲
    addData(audioData) {
        try {
            let rawData;
            if (typeof audioData === 'string') {
                // Base64 解码
                const binaryString = atob(audioData);
                rawData = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    rawData[i] = binaryString.charCodeAt(i);
                }
            } else if (audioData instanceof ArrayBuffer) {
                rawData = new Uint8Array(audioData);
            } else if (audioData instanceof Uint8Array) {
                rawData = audioData;
            } else {
                console.error('不支持的音频数据格式:', typeof audioData);
                return;
            }
            
            this.buffer.push(rawData);
            
            // 计算当前缓冲大小
            const totalSize = this.buffer.reduce((sum, arr) => sum + arr.length, 0);
            
            // 如果缓冲足够大，或者已经在播放中，处理音频
            if (totalSize >= this.minBufferSize || this.isPlaying) {
                this.processBuffer();
            }
        } catch (error) {
            console.error('添加音频数据失败:', error);
        }
    },
    
    // 处理缓冲区，合并并播放
    processBuffer() {
        if (this.buffer.length === 0) return;
        
        this.init();
        
        // 合并所有缓冲的数据
        const totalLength = this.buffer.reduce((sum, arr) => sum + arr.length, 0);
        const merged = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of this.buffer) {
            merged.set(arr, offset);
            offset += arr.length;
        }
        this.buffer = [];
        
        // 16-bit PCM 格式：每样本 2 字节
        const numSamples = Math.floor(merged.length / 2);
        if (numSamples < 100) return; // 数据太少，跳过
        
        const audioBuffer = this.context.createBuffer(1, numSamples, this.sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        const view = new DataView(merged.buffer, merged.byteOffset, merged.byteLength);
        
        // 将 16-bit signed integer 转换为 -1.0 到 1.0 的浮点数
        for (let i = 0; i < numSamples; i++) {
            const int16 = view.getInt16(i * 2, true); // little-endian
            channelData[i] = int16 / 32768.0;
        }
        
        // 创建音频源并播放
        const source = this.context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.context.destination);
        
        // 计算播放时间，确保连续播放无缝衔接
        const currentTime = this.context.currentTime;
        const startTime = Math.max(currentTime + 0.01, this.nextPlayTime);
        
        source.start(startTime);
        this.nextPlayTime = startTime + audioBuffer.duration;
        this.isPlaying = true;
        
        source.onended = () => {
            // 检查是否还有待播放的数据
            if (this.buffer.length > 0) {
                this.processBuffer();
            } else if (this.context.currentTime >= this.nextPlayTime - 0.05) {
                this.isPlaying = false;
            }
        };
        
        console.log('🔊 播放音频, 样本数:', numSamples, '时长:', audioBuffer.duration.toFixed(2), '秒');
    },
    
    // 清空缓冲
    clear() {
        this.buffer = [];
        this.isPlaying = false;
        this.nextPlayTime = 0;
    }
};

// 兼容旧接口
function playAudio(audioData) {
    audioPlayer.addData(audioData);
}

// ===== 初始化粒子动画 =====
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const particleCount = 50;
    
    // 创建粒子
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.2
        });
    }
    
    // 鼠标位置
    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    
    canvas.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    // 动画循环
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            // 鼠标吸引效果
            const dx = mouseX - particle.x;
            const dy = mouseY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) {
                particle.vx += dx * 0.0001;
                particle.vy += dy * 0.0001;
            }
            
            // 录音时更活跃
            if (isRecording) {
                particle.vx += (Math.random() - 0.5) * 0.1;
                particle.vy += (Math.random() - 0.5) * 0.1;
            }
            
            // 更新位置
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // 边界反弹
            if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
            
            // 绘制粒子
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
            ctx.fill();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
    
    // 窗口大小改变时调整画布
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// ===== 初始化音频波形 =====
function initWaveform() {
    const canvas = document.getElementById('waveform-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    function drawWaveform() {
        if (!analyser || !isRecording) {
            requestAnimationFrame(drawWaveform);
            return;
        }
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = canvas.width / bufferLength * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * canvas.height;
            
            const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
            gradient.addColorStop(0, '#007AFF');
            gradient.addColorStop(1, '#00F2FE');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
        
        requestAnimationFrame(drawWaveform);
    }
    
    drawWaveform();
}

// ===== 启动波形可视化 =====
function startWaveform() {
    document.getElementById('waveform-canvas').classList.add('active');
}

// ===== 更新状态 =====
function updateStatus(text, type) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    statusText.textContent = text;
    indicator.className = 'status-indicator ' + type;
}

// ===== Token统计相关 =====
function loadTokenStats() {
    const saved = localStorage.getItem('tokenStats');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            tokenStats.total = data.total || tokenStats.total;
        } catch (e) {
            console.error('加载Token统计失败:', e);
        }
    }
}

function saveTokenStats() {
    try {
        localStorage.setItem('tokenStats', JSON.stringify({
            total: tokenStats.total,
            lastUpdate: Date.now()
        }));
    } catch (e) {
        console.error('保存Token统计失败:', e);
    }
}

// ===== 工具函数 =====
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ===== 处理房间消息 =====
function handleRoomMessage(message) {
    switch (message.type) {
        case 'connected':
            // 已在 connectWebSocket 中处理
            break;
            
        case 'user_joined':
            console.log(`用户 ${message.userId} 加入房间`);
            updateRoomStatus(`${message.userId} 已加入`, true);
            break;
            
        case 'user_left':
            console.log(`用户 ${message.userId} 离开房间`);
            updateRoomStatus('对方已离开', false);
            break;
            
        case 'translation':
            // 收到房间内其他用户的翻译结果
            if (message.fromUserId !== userInfo.userId && message.data) {
                console.log(`📨 收到来自 ${message.fromUserId} 的翻译数据`);
                try {
                    // 将base64数据转换回二进制
                    const binaryData = Uint8Array.from(atob(message.data), c => c.charCodeAt(0));
                    // 解析Protobuf消息
                    const parsedMessage = parseProtobufMessage(binaryData.buffer);
                    
                    if (parsedMessage) {
                        // 获取事件类型（支持字符串和数字两种格式）
                        let eventType = parsedMessage.event;
                        if (typeof eventType === 'string' && root) {
                            const enumType = root.lookupEnum('data.speech.event.Type');
                            if (enumType && enumType.values[eventType] !== undefined) {
                                eventType = enumType.values[eventType];
                            }
                        }
                        
                        console.log(`📨 对方消息类型: ${eventType}`, parsedMessage);
                        
                        // 处理不同类型的消息
                        switch (eventType) {
                            case 654: // TranslationSubtitleResponse - 翻译字幕
                            case 'TranslationSubtitleResponse':
                                if (parsedMessage.text) {
                                    console.log(`🌐 对方译文: ${parsedMessage.text}`);
                                    otherSubtitleManager.appendText(parsedMessage.text);
                                }
                                break;
                                
                            case 651: // SourceSubtitleResponse - 原文字幕
                            case 'SourceSubtitleResponse':
                                // 可选：显示对方的原文
                                break;
                                
                            case 352: // TTSResponse - 语音合成
                            case 'TTSResponse':
                                // 播放对方的翻译语音
                                if (parsedMessage.data) {
                                    console.log(`🔊 播放对方语音`);
                                    playAudio(parsedMessage.data);
                                }
                                break;
                        }
                    }
                } catch (error) {
                    console.error('处理房间翻译消息失败:', error);
                }
            }
            break;
            
        case 'error':
            console.error('代理服务器错误:', message.message);
            updateStatus('连接错误: ' + message.message, 'error');
            break;
    }
}

// ===== 更新房间状态 =====
function updateRoomStatus(text, connected) {
    const roomStatus = document.getElementById('roomStatus');
    if (roomStatus) {
        roomStatus.textContent = text;
        roomStatus.className = 'room-status' + (connected ? ' connected' : '');
    }
}

// ===== 页面加载完成后初始化 =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

