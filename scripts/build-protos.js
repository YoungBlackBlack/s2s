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
const outputFile = path.join(outputDir, 'bundle.js');

// 创建输出目录
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

try {
    console.log('开始转换 Protobuf 文件...');
    
    // 使用 pbjs 将 proto 文件转换为 JSON 模块
    // 需要先安装: npm install -g protobufjs-cli
    const command = `pbjs -t json-module -w es6 -o ${outputFile} ${protosDir}/common/events.proto ${protosDir}/common/rpcmeta.proto ${protosDir}/products/understanding/base/au_base.proto ${protosDir}/products/understanding/ast/ast_service.proto`;
    
    execSync(command, { stdio: 'inherit' });
    
    console.log(`✅ Protobuf 文件已转换为: ${outputFile}`);
    console.log('现在可以在 app.js 中导入使用:');
    console.log("  import { root } from './protos/bundle.js';");
    
} catch (error) {
    console.error('❌ 转换失败:', error.message);
    console.log('\n请确保已安装 protobufjs-cli:');
    console.log('  npm install -g protobufjs-cli');
    process.exit(1);
}

