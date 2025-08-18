// VR翻译系统网络恢复能力测试
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class NetworkRecoveryTester {
    constructor() {
        this.baseUrl = 'http://localhost:3002';
        this.testResults = [];
        this.serverProcess = null;
        this.isServerRunning = false;
    }

    // 测试服务器连接状态
    async testConnection() {
        return new Promise((resolve) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3002,
                path: '/health',
                method: 'GET',
                timeout: 2000
            }, (res) => {
                resolve(res.statusCode === 200);
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => resolve(false));
            req.end();
        });
    }

    // 发送测试请求
    async sendTestRequest() {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const testData = JSON.stringify({
                x: Math.random() * 1920,
                y: Math.random() * 1080
            });

            const req = http.request({
                hostname: 'localhost',
                port: 3002,
                path: '/api/gaze',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': testData.length
                },
                timeout: 5000
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    const responseTime = Date.now() - startTime;
                    resolve({
                        success: res.statusCode === 200,
                        statusCode: res.statusCode,
                        responseTime,
                        body
                    });
                });
            });

            req.on('error', (err) => {
                const responseTime = Date.now() - startTime;
                resolve({
                    success: false,
                    error: err.message,
                    responseTime
                });
            });

            req.on('timeout', () => {
                const responseTime = Date.now() - startTime;
                resolve({
                    success: false,
                    error: 'Request timeout',
                    responseTime
                });
            });

            req.write(testData);
            req.end();
        });
    }

    // 记录测试结果
    logResult(phase, result, details = '') {
        const entry = {
            timestamp: new Date().toISOString(),
            phase,
            result,
            details
        };
        
        this.testResults.push(entry);
        
        const status = result ? '✅' : '❌';
        console.log(`${status} [${phase}] ${details}`);
    }

    // 等待指定时间
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 启动服务器
    async startServer() {
        return new Promise((resolve) => {
            console.log('🚀 启动测试服务器...');
            
            this.serverProcess = spawn('node', ['simple-server.js'], {
                cwd: path.join(__dirname, '../../backend'),
                env: { ...process.env, PORT: '3002' },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let serverOutput = '';
            this.serverProcess.stdout.on('data', (data) => {
                serverOutput += data.toString();
                if (serverOutput.includes('HTTP服务启动')) {
                    this.isServerRunning = true;
                    resolve(true);
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                console.log('服务器错误:', data.toString());
            });

            this.serverProcess.on('error', (err) => {
                console.log('服务器启动失败:', err.message);
                resolve(false);
            });

            // 10秒超时
            setTimeout(() => {
                if (!this.isServerRunning) {
                    console.log('服务器启动超时');
                    resolve(false);
                }
            }, 10000);
        });
    }

    // 停止服务器
    async stopServer() {
        return new Promise((resolve) => {
            if (!this.serverProcess) {
                resolve(true);
                return;
            }

            console.log('🛑 停止测试服务器...');
            
            this.serverProcess.kill('SIGTERM');
            this.isServerRunning = false;
            
            setTimeout(() => {
                if (this.serverProcess && !this.serverProcess.killed) {
                    this.serverProcess.kill('SIGKILL');
                }
                this.serverProcess = null;
                resolve(true);
            }, 3000);
        });
    }

    // 执行网络恢复测试
    async runNetworkRecoveryTest() {
        console.log('🔌 开始网络恢复能力测试...\n');
        
        try {
            // 阶段1: 正常连接测试
            console.log('📶 阶段1: 正常连接测试');
            await this.testNormalConnection();
            
            // 阶段2: 网络中断模拟
            console.log('\n💔 阶段2: 网络中断模拟');
            await this.testNetworkInterruption();
            
            // 阶段3: 网络恢复测试
            console.log('\n🔄 阶段3: 网络恢复测试');
            await this.testNetworkRecovery();
            
            // 阶段4: 恢复后稳定性测试
            console.log('\n✅ 阶段4: 恢复后稳定性测试');
            await this.testPostRecoveryStability();
            
            // 生成报告
            this.generateRecoveryReport();
            
        } catch (error) {
            console.error('❌ 网络恢复测试失败:', error.message);
            this.logResult('测试异常', false, error.message);
        } finally {
            await this.stopServer();
        }
    }

    // 阶段1: 正常连接测试
    async testNormalConnection() {
        // 检查是否有现有服务器运行
        const initialConnection = await this.testConnection();
        
        if (!initialConnection) {
            console.log('⚠️ 检测到没有运行的服务器，启动测试服务器...');
            const started = await this.startServer();
            if (!started) {
                throw new Error('无法启动测试服务器');
            }
            await this.sleep(2000); // 等待服务器完全启动
        }

        // 执行正常连接测试
        const normalTests = [];
        for (let i = 0; i < 10; i++) {
            const result = await this.sendTestRequest();
            normalTests.push(result);
            await this.sleep(100);
        }

        const successCount = normalTests.filter(r => r.success).length;
        const avgResponseTime = normalTests.reduce((sum, r) => sum + r.responseTime, 0) / normalTests.length;
        
        this.logResult('正常连接', successCount === 10, 
            `成功率: ${successCount}/10, 平均响应时间: ${avgResponseTime.toFixed(1)}ms`);
    }

    // 阶段2: 网络中断模拟
    async testNetworkInterruption() {
        console.log('⚠️ 模拟网络中断 - 停止服务器');
        await this.stopServer();
        await this.sleep(1000);

        // 测试中断期间的请求失败
        const interruptionTests = [];
        for (let i = 0; i < 5; i++) {
            console.log(`🔍 测试中断请求 ${i + 1}/5`);
            const result = await this.sendTestRequest();
            interruptionTests.push(result);
            await this.sleep(500);
        }

        const failureCount = interruptionTests.filter(r => !r.success).length;
        this.logResult('网络中断处理', failureCount === 5,
            `正确识别中断: ${failureCount}/5 个请求失败`);
    }

    // 阶段3: 网络恢复测试
    async testNetworkRecovery() {
        console.log('🔄 重新启动服务器模拟网络恢复');
        const recovered = await this.startServer();
        
        if (!recovered) {
            this.logResult('服务器恢复', false, '服务器重启失败');
            return;
        }

        await this.sleep(2000); // 等待服务器稳定

        // 测试恢复后的连接
        console.log('🔍 测试恢复后的连接...');
        const recoveryTests = [];
        
        for (let i = 0; i < 10; i++) {
            console.log(`📡 恢复测试 ${i + 1}/10`);
            const result = await this.sendTestRequest();
            recoveryTests.push(result);
            
            if (result.success) {
                console.log(`✅ 请求成功 - 响应时间: ${result.responseTime}ms`);
            } else {
                console.log(`❌ 请求失败 - ${result.error || '未知错误'}`);
            }
            
            await this.sleep(200);
        }

        const successCount = recoveryTests.filter(r => r.success).length;
        const avgResponseTime = recoveryTests.length > 0 ? 
            recoveryTests.reduce((sum, r) => sum + (r.responseTime || 0), 0) / recoveryTests.length : 0;

        this.logResult('网络恢复', successCount >= 8,
            `恢复成功率: ${successCount}/10, 平均响应时间: ${avgResponseTime.toFixed(1)}ms`);
    }

    // 阶段4: 恢复后稳定性测试
    async testPostRecoveryStability() {
        console.log('🔍 测试恢复后系统稳定性 (30秒)...');
        
        const stabilityTests = [];
        const testDuration = 30000; // 30秒
        const startTime = Date.now();
        let testCount = 0;

        while (Date.now() - startTime < testDuration) {
            testCount++;
            const result = await this.sendTestRequest();
            stabilityTests.push(result);
            
            if (testCount % 5 === 0) {
                const successRate = stabilityTests.filter(r => r.success).length / stabilityTests.length * 100;
                console.log(`📊 稳定性检查 - 已测试: ${testCount}, 成功率: ${successRate.toFixed(1)}%`);
            }
            
            await this.sleep(1000); // 每秒一次请求
        }

        const finalSuccessRate = stabilityTests.filter(r => r.success).length / stabilityTests.length * 100;
        const avgResponseTime = stabilityTests.filter(r => r.success).reduce((sum, r) => sum + r.responseTime, 0) / stabilityTests.filter(r => r.success).length;

        this.logResult('恢复后稳定性', finalSuccessRate >= 95,
            `测试时长: 30秒, 请求数: ${testCount}, 成功率: ${finalSuccessRate.toFixed(1)}%, 平均响应: ${avgResponseTime.toFixed(1)}ms`);
    }

    // 生成网络恢复测试报告
    generateRecoveryReport() {
        console.log('\n' + '='.repeat(60));
        console.log('🔌 网络恢复能力测试报告');
        console.log('='.repeat(60));

        const phaseResults = {};
        for (const result of this.testResults) {
            if (!phaseResults[result.phase]) {
                phaseResults[result.phase] = [];
            }
            phaseResults[result.phase].push(result);
        }

        for (const [phase, results] of Object.entries(phaseResults)) {
            const successCount = results.filter(r => r.result).length;
            const totalCount = results.length;
            const status = successCount === totalCount ? '✅ 通过' : '❌ 部分失败';
            
            console.log(`\n📊 ${phase}:`);
            console.log(`   状态: ${status} (${successCount}/${totalCount})`);
            
            for (const result of results) {
                const resultStatus = result.result ? '✅' : '❌';
                console.log(`   ${resultStatus} ${result.details}`);
            }
        }

        // 综合评估
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.result).length;
        const overallSuccessRate = (passedTests / totalTests * 100);

        console.log('\n🏆 综合评估:');
        console.log(`总测试项: ${totalTests}`);
        console.log(`通过项目: ${passedTests}`);
        console.log(`成功率: ${overallSuccessRate.toFixed(1)}%`);

        if (overallSuccessRate >= 90) {
            console.log('🎉 网络恢复能力: 优秀');
            console.log('   系统具备良好的网络中断恢复能力');
        } else if (overallSuccessRate >= 70) {
            console.log('⚠️ 网络恢复能力: 良好');
            console.log('   系统基本具备网络恢复能力，建议优化');
        } else {
            console.log('❌ 网络恢复能力: 需要改进');
            console.log('   系统网络恢复能力不足，需要重点优化');
        }

        // 保存详细报告
        this.saveRecoveryReport();
    }

    // 保存详细报告到文件
    saveRecoveryReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(__dirname, '../reports', `network_recovery_test_${timestamp}.json`);
        
        const report = {
            timestamp: new Date().toISOString(),
            testType: 'network_recovery',
            summary: {
                totalTests: this.testResults.length,
                passedTests: this.testResults.filter(r => r.result).length,
                successRate: (this.testResults.filter(r => r.result).length / this.testResults.length * 100)
            },
            detailedResults: this.testResults,
            systemInfo: {
                platform: process.platform,
                nodeVersion: process.version,
                testServer: this.baseUrl
            }
        };

        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log(`\n📄 详细报告已保存: ${reportPath}`);
        } catch (error) {
            console.error('❌ 保存报告失败:', error.message);
        }
    }
}

// 主程序入口
async function main() {
    const tester = new NetworkRecoveryTester();
    
    try {
        await tester.runNetworkRecoveryTest();
        console.log('\n🎯 网络恢复测试完成');
    } catch (error) {
        console.error('❌ 测试执行失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = NetworkRecoveryTester;