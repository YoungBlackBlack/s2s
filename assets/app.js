// ===== 同声传译 Demo - 主应用逻辑 =====

// 全局变量
let protobuf = null;
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
const mySubtitleManager = {
    container: null,
    items: [],
    maxItems: 5
};

const otherSubtitleManager = {
    container: null,
    items: [],
    maxItems: 5
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
        const response = await fetch('assets/protos/bundle.json');
        if (response.ok) {
            const json = await response.json();
            root = protobuf.Root.fromJSON(json);
            console.log('Protobuf (JSON) 加载成功');
        } else {
            // 如果 JSON 加载失败，回退到动态加载 .proto 文件
            console.warn('无法加载 bundle.json，回退到动态加载 .proto 文件');
            root = await protobuf.load([
                'protos/common/events.proto',
                'protos/common/rpcmeta.proto',
                'protos/products/understanding/base/au_base.proto',
                'protos/products/understanding/ast/ast_service.proto'
            ]);
            root.resolveAll();
            console.log('Protobuf (.proto) 加载成功');
        }
    } catch (error) {
        console.error('Protobuf 加载失败:', error);
        console.log('使用简化的消息处理方式');
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
        const auth = await fetch('/api/auth').then(r => r.json());
        if (!auth.appId || !auth.accessKey) {
            throw new Error('鉴权信息获取失败');
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
        
        ws.onopen = () => {
            console.log('WebSocket连接成功（通过Railway代理）');
            updateStatus('已连接', 'connected');
            updateRoomStatus('已连接', true);
            
            // 发送建连请求
            sendStartSession();
            resolve();
        };
        
        ws.onmessage = (event) => {
            // 检查是否是JSON消息（来自代理服务器的房间消息）
            try {
                const text = event.data.toString();
                if (text.startsWith('{')) {
                    const message = JSON.parse(text);
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
    
    // 构建StartSession消息
    // 注意：这里需要根据实际的Protobuf定义来构建
    // 由于protobufjs的加载可能需要调整，我们先使用JSON格式发送
    // 实际应该使用Protobuf编码
    
    const message = {
        request_meta: {
            session_id: currentSessionId
        },
        event: 100, // StartSession
        source_audio: {
            format: 'wav',
            codec: 'raw',
            rate: 16000,
            bits: 16,
            channel: 1
        },
        target_audio: {
            format: mode === 's2s' ? 'pcm' : undefined,
            rate: mode === 's2s' ? 24000 : undefined
        },
        request: {
            mode: mode,
            source_language: sourceLanguage,
            target_language: targetLanguage
        }
    };
    
    // 发送消息（需要Protobuf编码）
    sendProtobufMessage(message, 100);
}

// ===== 发送音频数据 =====
function sendAudioData(audioData) {
    if (!ws || ws.readyState !== WebSocket.OPEN || !isRecording) {
        return;
    }
    
    const message = {
        event: 200, // TaskRequest
        source_audio: {
            data: audioData
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
        if (root) {
            // 使用Protobuf编码
            const TranslateRequest = root.lookupType('data.speech.ast.TranslateRequest');
            const errMsg = TranslateRequest.verify(message);
            if (errMsg) throw Error(errMsg);
            
            const buffer = TranslateRequest.encode(message).finish();
            ws.send(buffer);
        } else {
            // 临时方案：使用JSON格式（仅用于开发测试）
            // 注意：实际API需要Protobuf二进制格式，此方案可能无法正常工作
            console.warn('使用JSON格式发送消息（临时方案，可能无法正常工作）');
            const jsonStr = JSON.stringify(message);
            const buffer = new TextEncoder().encode(jsonStr);
            ws.send(buffer);
        }
    } catch (error) {
        console.error('发送消息失败:', error);
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
    const message = parseProtobufMessage(data);
    if (!message) return;
    
    const eventType = message.event;
        
        switch (eventType) {
            case 150: // SessionStarted
                console.log('会话已开始');
                break;
                
            case 654: // TranslationSubtitleResponse
                if (message.text) {
                    // 判断是来自房间消息还是直接消息
                    // 如果是直接消息，说明是我的翻译结果
                    // 如果是通过房间消息转发的，会在handleRoomMessage中处理
                    mySubtitleManager.addSubtitle(message.text);
                }
                break;
                
            case 352: // TTSResponse
                if (mode === 's2s' && message.data) {
                    playAudio(message.data);
                }
                break;
                
            case 154: // UsageResponse
                handleUsageResponse(message);
                break;
                
            case 152: // SessionFinished
                console.log('会话已结束');
                break;
                
            case 153: // SessionFailed
                console.error('会话失败:', message.response_meta?.message);
                updateStatus('会话失败', 'error');
                break;
        }
    } catch (error) {
        console.error('处理消息失败:', error);
    }
}

// ===== 处理用量响应 =====
function handleUsageResponse(message) {
    if (message.response_meta?.billing?.items) {
        message.response_meta.billing.items.forEach(item => {
            const unit = item.unit;
            const quantity = item.quantity;
            
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

// ===== 播放音频 =====
function playAudio(audioData) {
    if (!audioContext) {
        audioContext = new AudioContext({ sampleRate: 24000 });
    }
    
    // 将PCM数据转换为AudioBuffer并播放
    // 这里需要根据实际的音频格式来处理
    // 假设是PCM 24kHz格式
    const buffer = audioContext.createBuffer(1, audioData.length / 2, 24000);
    const channelData = buffer.getChannelData(0);
    const view = new DataView(audioData);
    
    for (let i = 0; i < channelData.length; i++) {
        const int16 = view.getInt16(i * 2, true);
        channelData[i] = int16 / 32768.0;
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
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
            console.log('代理服务器连接成功');
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
                try {
                    // 将base64数据转换回二进制
                    const binaryData = Uint8Array.from(atob(message.data), c => c.charCodeAt(0));
                    // 解析Protobuf消息
                    const parsedMessage = parseProtobufMessage(binaryData.buffer);
                    if (parsedMessage && parsedMessage.event === 654 && parsedMessage.text) {
                        // 显示在"对方的翻译"区域
                        otherSubtitleManager.addSubtitle(parsedMessage.text);
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

