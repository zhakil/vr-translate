// VR翻译系统自动化测试脚本
const http = require('http');
const fs = require('fs');
const path = require('path');

class VRTranslationTester {
    constructor() {
        this.baseUrl = 'http://localhost:3002';
        this.testResults = [];
        this.reportPath = path.join(__dirname, '../reports');
        
        // 确保报告目录存在
        if (!fs.existsSync(this.reportPath)) {
            fs.mkdirSync(this.reportPath, { recursive: true });
        }
    }

    // 发送HTTP请求的辅助方法
    async makeRequest(options, data = null) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    const responseTime = Date.now() - startTime;
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body,
                        responseTime: responseTime
                    });
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    // 记录测试结果
    logTestResult(testName, passed, details = '') {
        const result = {
            name: testName,
            passed: passed,
            timestamp: new Date().toISOString(),
            details: details
        };
        this.testResults.push(result);
        
        const status = passed ? '✅ 通过' : '❌ 失败';
        console.log(`${status} - ${testName}`);
        if (details) {
            console.log(`   详情: ${details}`);
        }
    }

    // 测试服务器健康状态
    async testHealth() {
        try {
            const options = {
                hostname: 'localhost',
                port: 3002,
                path: '/health',
                method: 'GET'
            };

            const response = await this.makeRequest(options);
            const isHealthy = response.statusCode === 200;
            const responseData = JSON.parse(response.body);
            
            this.logTestResult(
                '健康检查测试',
                isHealthy && responseData.status === 'healthy',
                `状态码: ${response.statusCode}, 响应时间: ${response.responseTime}ms`
            );

            return isHealthy;
        } catch (error) {
            this.logTestResult('健康检查测试', false, `错误: ${error.message}`);
            return false;
        }
    }

    // 测试注视数据端点
    async testGazeData() {
        try {
            const options = {
                hostname: 'localhost',
                port: 3002,
                path: '/api/gaze',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const testData = { x: 123.45, y: 678.90 };
            const response = await this.makeRequest(options, testData);
            const success = response.statusCode === 200;
            
            let responseData = {};
            try {
                responseData = JSON.parse(response.body);
            } catch (e) {
                // 忽略JSON解析错误
            }

            this.logTestResult(
                '注视数据测试',
                success && responseData.success,
                `状态码: ${response.statusCode}, 响应时间: ${response.responseTime}ms`
            );

            return success;
        } catch (error) {
            this.logTestResult('注视数据测试', false, `错误: ${error.message}`);
            return false;
        }
    }

    // 测试截图翻译端点
    async testScreenshot() {
        try {
            const options = {
                hostname: 'localhost',
                port: 3002,
                path: '/api/screenshot',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const testData = {
                image: 'data:image/jpeg;base64,test_image_data',
                sourceLang: 'en',
                targetLang: 'zh'
            };

            const response = await this.makeRequest(options, testData);
            const success = response.statusCode === 200;
            
            let responseData = {};
            try {
                responseData = JSON.parse(response.body);
            } catch (e) {
                // 忽略JSON解析错误
            }

            const hasTranslation = responseData.original && responseData.translation;

            this.logTestResult(
                '截图翻译测试',
                success && hasTranslation,
                `状态码: ${response.statusCode}, 响应时间: ${response.responseTime}ms, 翻译: ${responseData.translation || '无'}`
            );

            return success && hasTranslation;
        } catch (error) {
            this.logTestResult('截图翻译测试', false, `错误: ${error.message}`);
            return false;
        }
    }

    // 测试配置更新端点
    async testConfig() {
        try {
            const options = {
                hostname: 'localhost',
                port: 3002,
                path: '/api/config',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const testData = {
                translation: {
                    engine: 'deepl',
                    targetLang: 'zh'
                },
                gaze: {
                    timeThreshold: 1000,
                    stabilityThreshold: 50
                }
            };

            const response = await this.makeRequest(options, testData);
            const success = response.statusCode === 200;
            
            let responseData = {};
            try {
                responseData = JSON.parse(response.body);
            } catch (e) {
                // 忽略JSON解析错误
            }

            this.logTestResult(
                '配置更新测试',
                success && responseData.success,
                `状态码: ${response.statusCode}, 响应时间: ${response.responseTime}ms`
            );

            return success;
        } catch (error) {
            this.logTestResult('配置更新测试', false, `错误: ${error.message}`);
            return false;
        }
    }

    // 并发测试
    async testConcurrency() {
        console.log('🔄 开始并发测试 (10个同时请求)...');
        
        const requests = [];
        for (let i = 0; i < 10; i++) {
            const options = {
                hostname: 'localhost',
                port: 3002,
                path: '/api/gaze',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            const testData = { x: 100 + i, y: 200 + i };
            requests.push(this.makeRequest(options, testData));
        }

        try {
            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const totalTime = Date.now() - startTime;
            
            const successCount = responses.filter(r => r.statusCode === 200).length;
            const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
            
            const allSuccess = successCount === 10;
            
            this.logTestResult(
                '并发处理测试',
                allSuccess,
                `成功: ${successCount}/10, 总时间: ${totalTime}ms, 平均响应: ${Math.round(avgResponseTime)}ms`
            );

            return allSuccess;
        } catch (error) {
            this.logTestResult('并发处理测试', false, `错误: ${error.message}`);
            return false;
        }
    }

    // 性能基准测试
    async testPerformance() {
        console.log('⚡ 开始性能基准测试...');
        
        const tests = [
            { name: '健康检查', path: '/health', method: 'GET', data: null },
            { name: '注视数据', path: '/api/gaze', method: 'POST', data: { x: 100, y: 200 } },
            { name: '截图翻译', path: '/api/screenshot', method: 'POST', data: { image: 'test', sourceLang: 'en', targetLang: 'zh' } }
        ];

        const performanceResults = {};

        for (const test of tests) {
            const times = [];
            
            for (let i = 0; i < 5; i++) {
                try {
                    const options = {
                        hostname: 'localhost',
                        port: 3002,
                        path: test.path,
                        method: test.method,
                        headers: test.data ? { 'Content-Type': 'application/json' } : {}
                    };

                    const response = await this.makeRequest(options, test.data);
                    if (response.statusCode === 200) {
                        times.push(response.responseTime);
                    }
                } catch (error) {
                    console.log(`性能测试错误 (${test.name}): ${error.message}`);
                }
                
                // 测试间隔
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (times.length > 0) {
                const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
                const minTime = Math.min(...times);
                const maxTime = Math.max(...times);
                
                performanceResults[test.name] = { avgTime, minTime, maxTime, count: times.length };
                
                this.logTestResult(
                    `性能测试-${test.name}`,
                    avgTime < 1000, // 1秒以内视为通过
                    `平均: ${Math.round(avgTime)}ms, 最小: ${minTime}ms, 最大: ${maxTime}ms`
                );
            } else {
                this.logTestResult(`性能测试-${test.name}`, false, '所有请求均失败');
            }
        }

        return performanceResults;
    }

    // 生成测试报告
    generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = path.join(this.reportPath, `automated_test_${timestamp}.json`);
        const htmlReportFile = path.join(this.reportPath, `automated_test_${timestamp}.html`);
        
        const summary = {
            timestamp: new Date().toISOString(),
            totalTests: this.testResults.length,
            passed: this.testResults.filter(r => r.passed).length,
            failed: this.testResults.filter(r => r.passed === false).length,
            results: this.testResults
        };

        // JSON报告
        fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2));
        
        // HTML报告
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>VR翻译系统自动化测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { margin: 20px 0; }
        .test-result { margin: 10px 0; padding: 10px; border-left: 4px solid #ddd; }
        .passed { border-left-color: #4CAF50; background: #f1f8e9; }
        .failed { border-left-color: #f44336; background: #ffebee; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 VR翻译系统自动化测试报告</h1>
        <p><strong>测试时间:</strong> ${summary.timestamp}</p>
        <p><strong>测试服务器:</strong> ${this.baseUrl}</p>
    </div>
    
    <div class="summary">
        <h2>📊 测试概要</h2>
        <p>总测试数: <strong>${summary.totalTests}</strong></p>
        <p>通过: <strong style="color: green;">${summary.passed}</strong></p>
        <p>失败: <strong style="color: red;">${summary.failed}</strong></p>
        <p>成功率: <strong>${Math.round((summary.passed / summary.totalTests) * 100)}%</strong></p>
    </div>
    
    <div class="results">
        <h2>🔍 详细结果</h2>
        ${this.testResults.map(result => `
            <div class="test-result ${result.passed ? 'passed' : 'failed'}">
                <h3>${result.passed ? '✅' : '❌'} ${result.name}</h3>
                <p class="timestamp">${result.timestamp}</p>
                ${result.details ? `<p><strong>详情:</strong> ${result.details}</p>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
        
        fs.writeFileSync(htmlReportFile, htmlContent);
        
        console.log(`\n📄 测试报告已生成:`);
        console.log(`   JSON: ${reportFile}`);
        console.log(`   HTML: ${htmlReportFile}`);
        
        return { jsonReport: reportFile, htmlReport: htmlReportFile };
    }

    // 运行所有测试
    async runAllTests() {
        console.log('🚀 开始VR翻译系统自动化测试...\n');
        
        const startTime = Date.now();
        
        // 基础功能测试
        console.log('📡 API功能测试:');
        await this.testHealth();
        await this.testGazeData();
        await this.testScreenshot();
        await this.testConfig();
        
        console.log('\n🔄 并发和性能测试:');
        await this.testConcurrency();
        await this.testPerformance();
        
        const totalTime = Date.now() - startTime;
        
        // 生成报告
        console.log('\n📄 生成测试报告...');
        const reports = this.generateReport();
        
        // 输出总结
        console.log('\n🎯 测试总结:');
        console.log(`   总时间: ${Math.round(totalTime / 1000)}秒`);
        console.log(`   总测试: ${this.testResults.length}`);
        console.log(`   通过: ${this.testResults.filter(r => r.passed).length}`);
        console.log(`   失败: ${this.testResults.filter(r => r.passed === false).length}`);
        
        const successRate = Math.round((this.testResults.filter(r => r.passed).length / this.testResults.length) * 100);
        console.log(`   成功率: ${successRate}%`);
        
        if (successRate === 100) {
            console.log('\n🎉 所有测试通过！系统运行正常。');
        } else if (successRate >= 80) {
            console.log('\n⚠️ 大部分测试通过，建议检查失败项。');
        } else {
            console.log('\n❌ 多项测试失败，需要检查系统状态。');
        }
        
        return {
            success: successRate >= 80,
            reports: reports,
            summary: {
                total: this.testResults.length,
                passed: this.testResults.filter(r => r.passed).length,
                failed: this.testResults.filter(r => r.passed === false).length,
                successRate: successRate
            }
        };
    }
}

// 主程序入口
async function main() {
    const tester = new VRTranslationTester();
    
    try {
        const results = await tester.runAllTests();
        process.exit(results.success ? 0 : 1);
    } catch (error) {
        console.error('❌ 测试执行失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = VRTranslationTester;