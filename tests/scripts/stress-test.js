// VR翻译系统高级压力测试脚本
const http = require('http');
const cluster = require('cluster');
const os = require('os');
const fs = require('fs');
const path = require('path');

class VRTranslationStressTester {
    constructor() {
        this.baseUrl = 'http://localhost:3002';
        this.results = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            minResponseTime: Infinity,
            maxResponseTime: 0,
            responseTimes: [],
            errors: [],
            startTime: null,
            endTime: null
        };
        
        this.testConfigs = {
            // 轻度压力测试
            light: {
                concurrentUsers: 10,
                requestsPerUser: 50,
                delayBetweenRequests: 100 // ms
            },
            // 中度压力测试
            medium: {
                concurrentUsers: 50,
                requestsPerUser: 100,
                delayBetweenRequests: 50
            },
            // 重度压力测试
            heavy: {
                concurrentUsers: 100,
                requestsPerUser: 200,
                delayBetweenRequests: 10
            },
            // 极限压力测试
            extreme: {
                concurrentUsers: 500,
                requestsPerUser: 100,
                delayBetweenRequests: 1
            }
        };
    }

    // 发送HTTP请求
    async makeRequest(endpoint, data = null, method = 'GET') {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const options = {
                hostname: 'localhost',
                port: 3002,
                path: endpoint,
                method: method,
                headers: data ? {'Content-Type': 'application/json'} : {}
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    const responseTime = Date.now() - startTime;
                    resolve({
                        statusCode: res.statusCode,
                        body: body,
                        responseTime: responseTime,
                        success: res.statusCode >= 200 && res.statusCode < 300
                    });
                });
            });

            req.on('error', (err) => {
                const responseTime = Date.now() - startTime;
                resolve({
                    statusCode: 0,
                    body: null,
                    responseTime: responseTime,
                    success: false,
                    error: err.message
                });
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    // 单用户测试流程
    async simulateUser(userId, config) {
        const userResults = {
            userId: userId,
            requests: 0,
            successes: 0,
            failures: 0,
            responseTimes: []
        };

        console.log(`👤 用户 ${userId} 开始测试...`);

        for (let i = 0; i < config.requestsPerUser; i++) {
            try {
                // 模拟不同类型的请求
                const requestType = Math.floor(Math.random() * 4);
                let response;

                switch (requestType) {
                    case 0: // 健康检查
                        response = await this.makeRequest('/health');
                        break;
                    case 1: // 注视数据
                        response = await this.makeRequest('/api/gaze', {
                            x: Math.random() * 1920,
                            y: Math.random() * 1080
                        }, 'POST');
                        break;
                    case 2: // 截图翻译
                        response = await this.makeRequest('/api/screenshot', {
                            image: this.generateRandomImageData(),
                            sourceLang: this.getRandomLanguage(),
                            targetLang: 'zh'
                        }, 'POST');
                        break;
                    case 3: // 配置更新
                        response = await this.makeRequest('/api/config', {
                            translation: { targetLang: this.getRandomLanguage() },
                            gaze: { timeThreshold: Math.random() * 2000 }
                        }, 'POST');
                        break;
                }

                userResults.requests++;
                userResults.responseTimes.push(response.responseTime);

                if (response.success) {
                    userResults.successes++;
                } else {
                    userResults.failures++;
                    if (response.error) {
                        this.results.errors.push({
                            userId: userId,
                            error: response.error,
                            timestamp: new Date().toISOString()
                        });
                    }
                }

                // 请求间延迟
                if (config.delayBetweenRequests > 0) {
                    await new Promise(resolve => 
                        setTimeout(resolve, config.delayBetweenRequests + Math.random() * 50)
                    );
                }

            } catch (error) {
                userResults.failures++;
                this.results.errors.push({
                    userId: userId,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        console.log(`✅ 用户 ${userId} 完成测试 - 成功: ${userResults.successes}, 失败: ${userResults.failures}`);
        return userResults;
    }

    // 生成随机图像数据
    generateRandomImageData() {
        const sizes = [1000, 5000, 10000, 50000]; // 不同大小的测试数据
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        return 'data:image/jpeg;base64,' + 'A'.repeat(size);
    }

    // 获取随机语言
    getRandomLanguage() {
        const languages = ['en', 'zh', 'ja', 'fr', 'es', 'de', 'ko', 'ru'];
        return languages[Math.floor(Math.random() * languages.length)];
    }

    // 执行压力测试
    async runStressTest(testLevel = 'medium') {
        console.log(`🚀 开始 ${testLevel} 级压力测试...`);
        
        const config = this.testConfigs[testLevel];
        if (!config) {
            throw new Error(`未知的测试级别: ${testLevel}`);
        }

        console.log(`📊 测试配置:`);
        console.log(`   并发用户: ${config.concurrentUsers}`);
        console.log(`   每用户请求数: ${config.requestsPerUser}`);
        console.log(`   请求间隔: ${config.delayBetweenRequests}ms`);
        console.log(`   预计总请求: ${config.concurrentUsers * config.requestsPerUser}`);

        this.results.startTime = Date.now();

        // 先测试服务器是否可用
        console.log('🔍 检查服务器状态...');
        const healthCheck = await this.makeRequest('/health');
        if (!healthCheck.success) {
            throw new Error('服务器不可用，无法进行压力测试');
        }
        console.log('✅ 服务器状态正常');

        // 创建并发用户
        const userPromises = [];
        for (let i = 0; i < config.concurrentUsers; i++) {
            userPromises.push(this.simulateUser(i + 1, config));
        }

        console.log(`⏳ 等待 ${config.concurrentUsers} 个并发用户完成测试...`);

        // 等待所有用户完成
        const userResults = await Promise.all(userPromises);

        this.results.endTime = Date.now();

        // 汇总结果
        this.aggregateResults(userResults);

        // 生成报告
        this.generateStressTestReport(testLevel);

        return this.results;
    }

    // 汇总测试结果
    aggregateResults(userResults) {
        let totalResponseTime = 0;

        for (const userResult of userResults) {
            this.results.totalRequests += userResult.requests;
            this.results.successfulRequests += userResult.successes;
            this.results.failedRequests += userResult.failures;

            for (const responseTime of userResult.responseTimes) {
                this.results.responseTimes.push(responseTime);
                totalResponseTime += responseTime;
                
                if (responseTime < this.results.minResponseTime) {
                    this.results.minResponseTime = responseTime;
                }
                if (responseTime > this.results.maxResponseTime) {
                    this.results.maxResponseTime = responseTime;
                }
            }
        }

        if (this.results.responseTimes.length > 0) {
            this.results.averageResponseTime = totalResponseTime / this.results.responseTimes.length;
        }
    }

    // 生成压力测试报告
    generateStressTestReport(testLevel) {
        const duration = (this.results.endTime - this.results.startTime) / 1000;
        const successRate = (this.results.successfulRequests / this.results.totalRequests * 100) || 0;
        const requestsPerSecond = this.results.totalRequests / duration;

        // 计算响应时间百分位数
        const sortedTimes = this.results.responseTimes.sort((a, b) => a - b);
        const p50 = this.getPercentile(sortedTimes, 50);
        const p95 = this.getPercentile(sortedTimes, 95);
        const p99 = this.getPercentile(sortedTimes, 99);

        console.log('\n🎯 压力测试结果总结:');
        console.log('====================');
        console.log(`测试级别: ${testLevel}`);
        console.log(`测试时长: ${duration.toFixed(2)}秒`);
        console.log(`总请求数: ${this.results.totalRequests}`);
        console.log(`成功请求: ${this.results.successfulRequests}`);
        console.log(`失败请求: ${this.results.failedRequests}`);
        console.log(`成功率: ${successRate.toFixed(2)}%`);
        console.log(`请求速率: ${requestsPerSecond.toFixed(2)} 请求/秒`);
        console.log('\n📊 响应时间统计:');
        console.log(`平均响应时间: ${this.results.averageResponseTime.toFixed(2)}ms`);
        console.log(`最小响应时间: ${this.results.minResponseTime}ms`);
        console.log(`最大响应时间: ${this.results.maxResponseTime}ms`);
        console.log(`50th百分位数: ${p50}ms`);
        console.log(`95th百分位数: ${p95}ms`);
        console.log(`99th百分位数: ${p99}ms`);

        if (this.results.errors.length > 0) {
            console.log(`\n❌ 错误统计: ${this.results.errors.length}个错误`);
            const errorTypes = {};
            for (const error of this.results.errors) {
                errorTypes[error.error] = (errorTypes[error.error] || 0) + 1;
            }
            for (const [errorType, count] of Object.entries(errorTypes)) {
                console.log(`   ${errorType}: ${count}次`);
            }
        }

        // 性能评估
        console.log('\n📈 性能评估:');
        if (successRate >= 99) {
            console.log('✅ 优秀 - 系统在压力下表现非常稳定');
        } else if (successRate >= 95) {
            console.log('🟡 良好 - 系统在压力下表现良好，有少量失败');
        } else if (successRate >= 90) {
            console.log('⚠️ 一般 - 系统在压力下有明显的失败率');
        } else {
            console.log('❌ 不佳 - 系统在压力下表现不稳定，需要优化');
        }

        if (this.results.averageResponseTime <= 100) {
            console.log('⚡ 响应速度: 优秀 (≤100ms)');
        } else if (this.results.averageResponseTime <= 500) {
            console.log('🟡 响应速度: 良好 (≤500ms)');
        } else if (this.results.averageResponseTime <= 1000) {
            console.log('⚠️ 响应速度: 一般 (≤1000ms)');
        } else {
            console.log('❌ 响应速度: 需要改进 (>1000ms)');
        }

        // 保存详细报告到文件
        this.saveReportToFile(testLevel, {
            duration,
            successRate,
            requestsPerSecond,
            p50, p95, p99
        });
    }

    // 计算百分位数
    getPercentile(sortedArray, percentile) {
        if (sortedArray.length === 0) return 0;
        const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
        return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
    }

    // 保存报告到文件
    saveReportToFile(testLevel, stats) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(__dirname, '../reports', `stress_test_${testLevel}_${timestamp}.json`);
        
        const report = {
            timestamp: new Date().toISOString(),
            testLevel: testLevel,
            configuration: this.testConfigs[testLevel],
            results: this.results,
            statistics: stats,
            systemInfo: {
                platform: os.platform(),
                cpus: os.cpus().length,
                totalMemory: os.totalmem(),
                freeMemory: os.freemem(),
                nodeVersion: process.version
            }
        };

        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log(`\n📄 详细报告已保存: ${reportPath}`);
        } catch (error) {
            console.error('❌ 保存报告失败:', error.message);
        }
    }

    // 运行所有级别的测试
    async runAllTests() {
        const testLevels = ['light', 'medium', 'heavy'];
        const allResults = {};

        for (const level of testLevels) {
            console.log(`\n${'='.repeat(50)}`);
            console.log(`开始 ${level.toUpperCase()} 级压力测试`);
            console.log(`${'='.repeat(50)}`);

            try {
                const results = await this.runStressTest(level);
                allResults[level] = results;
                
                // 测试间休息
                console.log('⏳ 等待5秒后进行下一级测试...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
            } catch (error) {
                console.error(`❌ ${level} 级测试失败:`, error.message);
                allResults[level] = { error: error.message };
            }
        }

        // 生成综合报告
        this.generateComprehensiveReport(allResults);
        return allResults;
    }

    // 生成综合测试报告
    generateComprehensiveReport(allResults) {
        console.log('\n' + '='.repeat(60));
        console.log('🎯 VR翻译系统压力测试综合报告');
        console.log('='.repeat(60));

        for (const [level, results] of Object.entries(allResults)) {
            if (results.error) {
                console.log(`❌ ${level.toUpperCase()}: 测试失败 - ${results.error}`);
                continue;
            }

            const successRate = (results.successfulRequests / results.totalRequests * 100) || 0;
            const avgResponseTime = results.averageResponseTime || 0;
            
            console.log(`\n📊 ${level.toUpperCase()} 级测试:`);
            console.log(`   总请求: ${results.totalRequests}`);
            console.log(`   成功率: ${successRate.toFixed(1)}%`);
            console.log(`   平均响应时间: ${avgResponseTime.toFixed(1)}ms`);
            console.log(`   错误数: ${results.errors.length}`);
        }

        console.log('\n🏆 测试结论:');
        console.log('系统压力测试已完成，请查看详细报告文件获取更多信息。');
    }
}

// 主程序入口
async function main() {
    const tester = new VRTranslationStressTester();
    
    // 从命令行获取测试级别
    const testLevel = process.argv[2] || 'medium';
    
    if (testLevel === 'all') {
        await tester.runAllTests();
    } else if (tester.testConfigs[testLevel]) {
        await tester.runStressTest(testLevel);
    } else {
        console.log('❌ 无效的测试级别');
        console.log('可用选项: light, medium, heavy, extreme, all');
        console.log('用法: node stress-test.js [level]');
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch(error => {
        console.error('❌ 测试执行失败:', error.message);
        process.exit(1);
    });
}

module.exports = VRTranslationStressTester;