// ===== Token统计页面逻辑 =====

// Token单价（元/百万Token）
const TOKEN_PRICES = {
    input: 80,
    output_text: 80,
    output_audio: 300
};

// 加载并显示统计数据
function loadStats() {
    // 从localStorage加载累计数据
    const saved = localStorage.getItem('tokenStats');
    let totalStats = {
        input_audio_tokens: 0,
        output_text_tokens: 0,
        output_audio_tokens: 0
    };
    
    if (saved) {
        try {
            const data = JSON.parse(saved);
            totalStats = data.total || totalStats;
        } catch (e) {
            console.error('加载统计数据失败:', e);
        }
    }
    
    // 当前会话数据（从sessionStorage获取，如果有的话）
    const currentStats = {
        input_audio_tokens: 0,
        output_text_tokens: 0,
        output_audio_tokens: 0
    };
    
    // 计算费用
    const stats = [
        {
            name: '输入音频Token',
            key: 'input_audio_tokens',
            unit: 'input',
            current: currentStats.input_audio_tokens,
            total: totalStats.input_audio_tokens,
            price: TOKEN_PRICES.input
        },
        {
            name: '输出文本Token',
            key: 'output_text_tokens',
            unit: 'output_text',
            current: currentStats.output_text_tokens,
            total: totalStats.output_text_tokens,
            price: TOKEN_PRICES.output_text
        },
        {
            name: '输出音频Token',
            key: 'output_audio_tokens',
            unit: 'output_audio',
            current: currentStats.output_audio_tokens,
            total: totalStats.output_audio_tokens,
            price: TOKEN_PRICES.output_audio
        }
    ];
    
    // 渲染统计卡片
    renderStatCards(stats);
    
    // 渲染统计表格
    renderStatsTable(stats);
}

// 渲染统计卡片
function renderStatCards(stats) {
    const grid = document.getElementById('statsGrid');
    grid.innerHTML = '';
    
    stats.forEach(stat => {
        const currentCost = (stat.current / 1000000) * stat.price;
        const totalCost = (stat.total / 1000000) * stat.price;
        
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <h3>${stat.name}</h3>
            <div class="stat-value">${formatNumber(stat.total)}</div>
            <div class="stat-unit">累计Token</div>
            <div class="stat-cost">累计费用: ¥${currentCost.toFixed(4)}</div>
        `;
        grid.appendChild(card);
    });
    
    // 总计卡片
    const totalCurrent = stats.reduce((sum, s) => sum + s.current, 0);
    const totalTotal = stats.reduce((sum, s) => sum + s.total, 0);
    const totalCurrentCost = stats.reduce((sum, s) => sum + (s.current / 1000000) * s.price, 0);
    const totalTotalCost = stats.reduce((sum, s) => sum + (s.total / 1000000) * s.price, 0);
    
    const totalCard = document.createElement('div');
    totalCard.className = 'stat-card';
    totalCard.style.border = '2px solid var(--primary-color)';
    totalCard.innerHTML = `
        <h3>总计</h3>
        <div class="stat-value">${formatNumber(totalTotal)}</div>
        <div class="stat-unit">累计Token</div>
        <div class="stat-cost" style="font-size: 24px; color: var(--primary-color);">累计费用: ¥${totalTotalCost.toFixed(4)}</div>
    `;
    grid.appendChild(totalCard);
}

// 渲染统计表格
function renderStatsTable(stats) {
    const tbody = document.getElementById('statsTableBody');
    tbody.innerHTML = '';
    
    let totalCurrent = 0;
    let totalTotal = 0;
    let totalCurrentCost = 0;
    let totalTotalCost = 0;
    
    stats.forEach(stat => {
        const currentCost = (stat.current / 1000000) * stat.price;
        const totalCost = (stat.total / 1000000) * stat.price;
        
        totalCurrent += stat.current;
        totalTotal += stat.total;
        totalCurrentCost += currentCost;
        totalTotalCost += totalCost;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${stat.name}</td>
            <td>${formatNumber(stat.current)}</td>
            <td>${formatNumber(stat.total)}</td>
            <td>¥${stat.price}</td>
            <td>¥${currentCost.toFixed(4)}</td>
            <td>¥${totalCost.toFixed(4)}</td>
        `;
        tbody.appendChild(row);
    });
    
    // 总计行
    const totalRow = document.createElement('tr');
    totalRow.className = 'total-row';
    totalRow.innerHTML = `
        <td><strong>总计</strong></td>
        <td><strong>${formatNumber(totalCurrent)}</strong></td>
        <td><strong>${formatNumber(totalTotal)}</strong></td>
        <td>-</td>
        <td><strong>¥${totalCurrentCost.toFixed(4)}</strong></td>
        <td><strong>¥${totalTotalCost.toFixed(4)}</strong></td>
    `;
    tbody.appendChild(totalRow);
}

// 格式化数字
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return num.toLocaleString();
}

// 导出统计数据
function exportStats() {
    const saved = localStorage.getItem('tokenStats');
    const data = saved ? JSON.parse(saved) : { total: { input_audio_tokens: 0, output_text_tokens: 0, output_audio_tokens: 0 } };
    
    // 计算费用
    const stats = {
        timestamp: new Date().toISOString(),
        total: {
            input_audio_tokens: data.total.input_audio_tokens,
            output_text_tokens: data.total.output_text_tokens,
            output_audio_tokens: data.total.output_audio_tokens
        },
        costs: {
            input_cost: (data.total.input_audio_tokens / 1000000) * TOKEN_PRICES.input,
            output_text_cost: (data.total.output_text_tokens / 1000000) * TOKEN_PRICES.output_text,
            output_audio_cost: (data.total.output_audio_tokens / 1000000) * TOKEN_PRICES.output_audio,
            total_cost: (data.total.input_audio_tokens / 1000000) * TOKEN_PRICES.input +
                       (data.total.output_text_tokens / 1000000) * TOKEN_PRICES.output_text +
                       (data.total.output_audio_tokens / 1000000) * TOKEN_PRICES.output_audio
        },
        prices: TOKEN_PRICES
    };
    
    // 下载JSON文件
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `token-stats-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 页面加载时初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadStats);
} else {
    loadStats();
}

