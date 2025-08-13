// Quest 3 VR翻译服务检测脚本
const http = require('http');

console.log('🥽 Quest 3 VR翻译服务检测');
console.log('='.repeat(40));

// 检测函数
function checkService(url, name) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            if (res.statusCode === 200) {
                console.log(`✅ ${name}: 运行正常 (${res.statusCode})`);
                resolve(true);
            } else {
                console.log(`❌ ${name}: HTTP ${res.statusCode}`);
                resolve(false);
            }
        });
        
        req.on('error', (error) => {
            console.log(`❌ ${name}: ${error.message}`);
            resolve(false);
        });
        
        req.setTimeout(3000, () => {
            console.log(`⏱️ ${name}: 连接超时`);
            req.destroy();
            resolve(false);
        });
    });
}

async function main() {
    const services = [
        { url: 'http://localhost:3000/api/stats', name: '后端API服务' },
        { url: 'http://127.0.0.1:8888/quest3-vr-ui.html', name: 'Quest 3 VR界面' },
    ];
    
    let allOk = true;
    
    for (const service of services) {
        const ok = await checkService(service.url, service.name);
        if (!ok) allOk = false;
    }
    
    console.log('='.repeat(40));
    
    if (allOk) {
        console.log('🎉 所有服务运行正常！');
        console.log('');
        console.log('📱 Quest 3访问地址:');
        console.log('   http://[你的电脑IP]:8888/quest3-vr-ui.html');
        console.log('');
        console.log('💡 使用步骤:');
        console.log('1. 确保Quest 3与电脑连接同一WiFi');
        console.log('2. 在Quest 3浏览器中打开上述地址');
        console.log('3. 开始使用VR翻译功能');
    } else {
        console.log('⚠️ 部分服务未正常运行');
        console.log('请检查服务启动状态');
    }
}

main().catch(console.error);