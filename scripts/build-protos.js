#!/usr/bin/env node

/**
 * 将 Protobuf 文件转换为浏览器可用的 JSON 格式
 * 
 * 使用方法：
 * 1. 安装 protobufjs-cli: npm install -g protobufjs-cli
 * 2. 运行: node scripts/build-protos.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const protosDir = path.join(__dirname, '..', 'protos');
const outputDir = path.join(__dirname, '..', 'assets', 'protos');
const outputFile = path.join(outputDir, 'bundle.json');

// 创建输出目录
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

try {
    console.log('开始转换 Protobuf 文件为 JSON...');
    
    // 使用 npx pbjs 转换为 JSON 格式，这是最通用的格式
    // 使用 -p 指定 proto 搜索路径，避免 import 时找不到 common/ 下的文件
    const command = `npx pbjs -t json -p "${protosDir}" -o "${outputFile}" "${protosDir}/common/events.proto" "${protosDir}/common/rpcmeta.proto" "${protosDir}/products/understanding/base/au_base.proto" "${protosDir}/products/understanding/ast/ast_service.proto"`;
    
    console.log('执行命令:', command);
    execSync(command, { stdio: 'inherit' });
    
    console.log(`✅ Protobuf 文件已转换为: ${outputFile}`);
    console.log('现在可以在 app.js 中使用 fetch 加载:');
    console.log("  const response = await fetch('assets/protos/bundle.json');");
    console.log("  const json = await response.json();");
    console.log("  root = protobuf.Root.fromJSON(json);");
    
} catch (error) {
    console.error('❌ 转换失败:', error.message);
    console.log('\n请确保已安装 protobufjs-cli:');
    console.log('  npm install -g protobufjs-cli');
    process.exit(1);
}

