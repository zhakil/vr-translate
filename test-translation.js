// 快速测试翻译修复
const http = require('http');

function testTranslation(text, targetLang = 'ZH') {
    const postData = JSON.stringify({
        text: text,
        targetLang: targetLang
    });
    
    const options = {
        hostname: '127.0.0.1',
        port: 3000,
        path: '/api/translate',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                console.log(`测试: "${text}" → "${result.translation}" (${result.engine})`);
            } catch (error) {
                console.log('解析响应失败:', data);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('请求错误:', error);
    });
    
    req.write(postData);
    req.end();
}

console.log('🧪 开始测试翻译修复...');
setTimeout(() => testTranslation('hell'), 1000);
setTimeout(() => testTranslation('hello'), 2000);
setTimeout(() => testTranslation('heaven'), 3000);