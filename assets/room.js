// ===== 房间管理逻辑 =====

// 生成6位房间ID（字母+数字）
function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let roomId = '';
    for (let i = 0; i < 6; i++) {
        roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return roomId;
}

// 初始化粒子动画
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const particleCount = 30;
    
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
    
    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    
    canvas.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            const dx = mouseX - particle.x;
            const dy = mouseY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) {
                particle.vx += dx * 0.0001;
                particle.vy += dy * 0.0001;
            }
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
            ctx.fill();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// 创建房间
function createRoom() {
    const roomId = generateRoomId();
    
    // 保存房间ID到sessionStorage
    sessionStorage.setItem('currentRoomId', roomId);
    
    // 显示房间ID
    document.getElementById('roomIdValue').textContent = roomId;
    document.getElementById('roomIdDisplay').style.display = 'block';
    
    // 3秒后自动进入房间
    setTimeout(() => {
        enterRoom(roomId);
    }, 3000);
}

// 加入房间
function joinRoom() {
    const roomId = document.getElementById('roomIdInput').value.trim().toUpperCase();
    
    if (!roomId || roomId.length !== 6) {
        alert('请输入6位房间号');
        return;
    }
    
    enterRoom(roomId);
}

// 进入房间
function enterRoom(roomId) {
    sessionStorage.setItem('currentRoomId', roomId);
    window.location.href = 'index.html';
}

// 退出登录
function logout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('userInfo');
        sessionStorage.removeItem('currentRoomId');
        window.location.href = 'login.html';
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    
    // 检查是否已登录
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
        window.location.href = 'login.html';
        return;
    }
    
    const user = JSON.parse(userInfo);
    document.getElementById('userName').textContent = user.username;
    
    // 绑定事件
    document.getElementById('createRoomBtn').addEventListener('click', createRoom);
    document.getElementById('joinRoomBtn').addEventListener('click', joinRoom);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // 房间号输入框：自动转大写，只允许字母和数字
    const roomIdInput = document.getElementById('roomIdInput');
    roomIdInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    
    // 回车键加入房间
    roomIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinRoom();
        }
    });
});

