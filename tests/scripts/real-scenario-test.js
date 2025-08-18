// VR翻译系统真实场景测试
const http = require('http');
const fs = require('fs');
const path = require('path');

class RealScenarioTester {
    constructor() {
        this.baseUrl = 'http://localhost:3002';
        this.testResults = [];
        this.scenarios = [
            {
                name: 'VR游戏菜单翻译',
                description: '用户在VR游戏中查看英文菜单',
                mockText: 'Start Game',
                expectedTranslation: '开始游戏',
                context: 'gaming'
            },
            {
                name: 'VR培训指导翻译',
                description: '企业VR培训中的安全指示',
                mockText: 'Safety First - Always wear protective gear',
                expectedTranslation: '安全第一 - 始终佩戴防护装备',
                context: 'safety'
            },
            {
                name: 'VR购物体验翻译',
                description: '虚拟商店中的产品信息',
                mockText: 'Premium Quality Headphones - $99.99',
                expectedTranslation: '优质耳机 - $99.99',
                context: 'shopping'
            },
            {
                name: 'VR教育内容翻译',
                description: '虚拟教室中的学习材料',
                mockText: 'The Solar System consists of eight planets',
                expectedTranslation: '太阳系由八颗行星组成',
                context: 'education'
            },
            {
                name: 'VR旅游导览翻译',
                description: '虚拟旅游景点介绍',
                mockText: 'Welcome to the Louvre Museum Virtual Tour',
                expectedTranslation: '欢迎参加卢浮宫博物馆虚拟导览',
                context: 'tourism'
            },
            {
                name: 'VR医疗培训翻译',
                description: '医疗VR培训中的专业术语',
                mockText: 'Patient shows symptoms of acute appendicitis',
                expectedTranslation: '患者出现急性阑尾炎症状',
                context: 'medical'
            }
        ];
        
        this.performanceMetrics = {
            totalScenarios: 0,
            successfulTranslations: 0,
            averageResponseTime: 0,
            averageGazeTime: 0,
            totalProcessingTime: 0
        };
    }

    // 模拟用户注视行为
    async simulateUserGaze(scenario) {
        const gazeData = {
            x: Math.random() * 1920, // 随机注视位置
            y: Math.random() * 1080,
            confidence: 0.85 + Math.random() * 0.15, // 85-100% 置信度
            timestamp: Date.now(),
            context: scenario.context
        };

        return this.makeRequest('/api/gaze', gazeData, 'POST');
    }

    // 模拟VR环境截图和OCR
    async simulateVRScreenshot(scenario) {
        // 模拟不同场景下的图像数据大小
        const imageSizes = {
            'gaming': 2048,
            'safety': 1024,
            'shopping': 3072,
            'education': 2560,
            'tourism': 4096,
            'medical': 1536
        };

        const imageSize = imageSizes[scenario.context] || 2048;
        const screenshotData = {
            image: 'data:image/jpeg;base64,' + 'A'.repeat(imageSize),
            sourceLang: 'en',
            targetLang: 'zh',
            context: scenario.context,
            originalText: scenario.mockText,
            confidence: 0.90 + Math.random() * 0.1,
            ocrRegion: {
                x: Math.floor(Math.random() * 1000),
                y: Math.floor(Math.random() * 600),
                width: 200 + Math.floor(Math.random() * 400),
                height: 50 + Math.floor(Math.random() * 100)
            }
        };

        return this.makeRequest('/api/screenshot', screenshotData, 'POST');
    }

    // 模拟配置更新（根据场景调整）
    async simulateContextConfig(scenario) {
        const contextConfigs = {
            'gaming': {
                translation: { engine: 'deepl', targetLang: 'zh', domain: 'gaming' },
                gaze: { timeThreshold: 800, stabilityThreshold: 30 }
            },
            'safety': {
                translation: { engine: 'deepl', targetLang: 'zh', domain: 'safety' },
                gaze: { timeThreshold: 1200, stabilityThreshold: 20 }
            },
            'shopping': {
                translation: { engine: 'deepl', targetLang: 'zh', domain: 'commerce' },
                gaze: { timeThreshold: 600, stabilityThreshold: 40 }
            },
            'education': {
                translation: { engine: 'deepl', targetLang: 'zh', domain: 'academic' },
                gaze: { timeThreshold: 1000, stabilityThreshold: 25 }
            },
            'tourism': {
                translation: { engine: 'deepl', targetLang: 'zh', domain: 'travel' },
                gaze: { timeThreshold: 900, stabilityThreshold: 35 }
            },
            'medical': {
                translation: { engine: 'deepl', targetLang: 'zh', domain: 'medical' },
                gaze: { timeThreshold: 1500, stabilityThreshold: 15 }
            }
        };

        const config = contextConfigs[scenario.context] || contextConfigs['gaming'];
        return this.makeRequest('/api/config', config, 'POST');
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
                headers: data ? {'Content-Type': 'application/json'} : {},
                timeout: 10000
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    const responseTime = Date.now() - startTime;
                    try {
                        const parsedBody = body ? JSON.parse(body) : null;
                        resolve({
                            statusCode: res.statusCode,
                            body: parsedBody,
                            responseTime: responseTime,
                            success: res.statusCode >= 200 && res.statusCode < 300
                        });
                    } catch (parseError) {
                        resolve({
                            statusCode: res.statusCode,
                            body: body,
                            responseTime: responseTime,
                            success: res.statusCode >= 200 && res.statusCode < 300,
                            parseError: parseError.message
                        });
                    }
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

            req.on('timeout', () => {
                const responseTime = Date.now() - startTime;
                resolve({
                    statusCode: 0,
                    body: null,
                    responseTime: responseTime,
                    success: false,
                    error: 'Request timeout'
                });
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    // 执行单个场景测试
    async runScenarioTest(scenario) {
        console.log(`\n🎯 测试场景: ${scenario.name}`);
        console.log(`📝 描述: ${scenario.description}`);
        console.log(`📄 原文: "${scenario.mockText}"`);
        
        const scenarioResults = {
            scenario: scenario.name,
            context: scenario.context,
            startTime: Date.now(),
            steps: [],
            success: false,
            totalTime: 0,
            translationAccuracy: 0
        };

        try {
            // 步骤1: 配置上下文
            console.log('⚙️ 步骤1: 配置场景上下文...');
            const configResult = await this.simulateContextConfig(scenario);
            scenarioResults.steps.push({
                step: 'context_config',
                success: configResult.success,
                responseTime: configResult.responseTime,
                details: '场景配置'
            });

            if (!configResult.success) {
                throw new Error('场景配置失败');
            }

            await this.sleep(100); // 模拟配置处理时间

            // 步骤2: 模拟用户注视
            console.log('👁️ 步骤2: 模拟用户注视行为...');
            const gazeStartTime = Date.now();
            
            // 模拟用户注视持续时间（根据上下文不同）
            const gazeDuration = {
                'gaming': 800,
                'safety': 1200,
                'shopping': 600,
                'education': 1000,
                'tourism': 900,
                'medical': 1500
            }[scenario.context] || 1000;

            // 发送多次注视数据模拟稳定注视
            const gazeRequests = [];
            const gazeCount = Math.ceil(gazeDuration / 100); // 每100ms一次
            
            for (let i = 0; i < gazeCount; i++) {
                const gazeResult = await this.simulateUserGaze(scenario);
                gazeRequests.push(gazeResult);
                
                if (i < gazeCount - 1) {
                    await this.sleep(100);
                }
            }

            const gazeTime = Date.now() - gazeStartTime;
            const gazeSuccess = gazeRequests.every(r => r.success);
            
            scenarioResults.steps.push({
                step: 'user_gaze',
                success: gazeSuccess,
                responseTime: gazeTime,
                details: `注视${gazeCount}次，持续${gazeTime}ms`
            });

            console.log(`   注视时长: ${gazeTime}ms (目标: ${gazeDuration}ms)`);

            if (!gazeSuccess) {
                throw new Error('注视数据传输失败');
            }

            // 步骤3: 触发截图和OCR翻译
            console.log('📸 步骤3: 执行截图和翻译...');
            const translationResult = await this.simulateVRScreenshot(scenario);
            
            scenarioResults.steps.push({
                step: 'screenshot_translation',
                success: translationResult.success,
                responseTime: translationResult.responseTime,
                details: '截图OCR和翻译处理'
            });

            if (!translationResult.success) {
                throw new Error('翻译处理失败');
            }

            // 步骤4: 验证翻译结果
            console.log('✅ 步骤4: 验证翻译质量...');
            const translationBody = translationResult.body;
            const hasTranslation = translationBody && translationBody.translation;
            const translationAccuracy = hasTranslation ? this.calculateTranslationAccuracy(
                translationBody.translation, scenario.expectedTranslation) : 0;

            scenarioResults.translationAccuracy = translationAccuracy;
            scenarioResults.actualTranslation = translationBody?.translation || '无翻译结果';
            scenarioResults.expectedTranslation = scenario.expectedTranslation;

            console.log(`   实际翻译: "${scenarioResults.actualTranslation}"`);
            console.log(`   期望翻译: "${scenario.expectedTranslation}"`);
            console.log(`   翻译质量: ${translationAccuracy.toFixed(1)}%`);

            // 计算总体成功率
            const allStepsSuccess = scenarioResults.steps.every(s => s.success);
            const qualityThreshold = 70; // 70%以上认为翻译质量可接受
            
            scenarioResults.success = allStepsSuccess && hasTranslation && translationAccuracy >= qualityThreshold;
            scenarioResults.totalTime = Date.now() - scenarioResults.startTime;

            const status = scenarioResults.success ? '✅ 成功' : '❌ 失败';
            console.log(`🎯 场景结果: ${status} (耗时: ${scenarioResults.totalTime}ms)`);

        } catch (error) {
            scenarioResults.success = false;
            scenarioResults.error = error.message;
            scenarioResults.totalTime = Date.now() - scenarioResults.startTime;
            
            console.log(`❌ 场景失败: ${error.message}`);
        }

        this.testResults.push(scenarioResults);
        return scenarioResults;
    }

    // 计算翻译准确性（简化版本）
    calculateTranslationAccuracy(actual, expected) {
        if (!actual || !expected) return 0;
        
        // 简单的字符级相似度计算
        const actualWords = actual.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').toLowerCase();
        const expectedWords = expected.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').toLowerCase();
        
        if (actualWords === expectedWords) return 100;
        
        // 计算Levenshtein距离相似度
        const maxLen = Math.max(actualWords.length, expectedWords.length);
        if (maxLen === 0) return 100;
        
        const distance = this.levenshteinDistance(actualWords, expectedWords);
        const similarity = ((maxLen - distance) / maxLen) * 100;
        
        return Math.max(0, similarity);
    }

    // Levenshtein距离计算
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    // 等待指定时间
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 运行所有真实场景测试
    async runAllScenarios() {
        console.log('🌟 开始VR翻译系统真实场景测试...');
        console.log(`📊 总场景数: ${this.scenarios.length}`);
        console.log('='.repeat(60));

        // 首先检查服务器状态
        console.log('🔍 检查服务器状态...');
        const healthCheck = await this.makeRequest('/health');
        if (!healthCheck.success) {
            throw new Error('服务器不可用，请先启动后端服务');
        }
        console.log('✅ 服务器状态正常\n');

        const startTime = Date.now();
        let successCount = 0;

        // 逐个执行场景测试
        for (let i = 0; i < this.scenarios.length; i++) {
            const scenario = this.scenarios[i];
            console.log(`\n[${ i + 1 }/${this.scenarios.length}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            
            const result = await this.runScenarioTest(scenario);
            
            if (result.success) {
                successCount++;
            }

            // 场景间休息，模拟真实使用间隔
            if (i < this.scenarios.length - 1) {
                console.log('⏳ 场景间休息 2 秒...');
                await this.sleep(2000);
            }
        }

        const totalTime = Date.now() - startTime;

        // 计算性能指标
        this.calculatePerformanceMetrics(totalTime);

        // 生成综合报告
        this.generateScenarioReport(successCount, totalTime);

        return {
            totalScenarios: this.scenarios.length,
            successfulScenarios: successCount,
            successRate: (successCount / this.scenarios.length) * 100,
            totalTime: totalTime,
            performanceMetrics: this.performanceMetrics
        };
    }

    // 计算性能指标
    calculatePerformanceMetrics(totalTime) {
        const successfulResults = this.testResults.filter(r => r.success);
        const responseTimes = [];
        const gazeTimes = [];

        for (const result of successfulResults) {
            responseTimes.push(result.totalTime);
            
            const gazeStep = result.steps.find(s => s.step === 'user_gaze');
            if (gazeStep) {
                gazeTimes.push(gazeStep.responseTime);
            }
        }

        this.performanceMetrics = {
            totalScenarios: this.testResults.length,
            successfulTranslations: successfulResults.length,
            averageResponseTime: responseTimes.length > 0 ? 
                responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
            averageGazeTime: gazeTimes.length > 0 ? 
                gazeTimes.reduce((a, b) => a + b, 0) / gazeTimes.length : 0,
            totalProcessingTime: totalTime,
            averageTranslationAccuracy: successfulResults.length > 0 ?
                successfulResults.reduce((sum, r) => sum + r.translationAccuracy, 0) / successfulResults.length : 0
        };
    }

    // 生成场景测试报告
    generateScenarioReport(successCount, totalTime) {
        console.log('\n' + '='.repeat(80));
        console.log('🌟 VR翻译系统真实场景测试报告');
        console.log('='.repeat(80));

        // 总体统计
        console.log('\n📊 总体统计:');
        console.log(`测试场景数: ${this.scenarios.length}`);
        console.log(`成功场景数: ${successCount}`);
        console.log(`成功率: ${((successCount / this.scenarios.length) * 100).toFixed(1)}%`);
        console.log(`总测试时间: ${(totalTime / 1000).toFixed(1)}秒`);

        // 性能指标
        console.log('\n⚡ 性能指标:');
        console.log(`平均响应时间: ${this.performanceMetrics.averageResponseTime.toFixed(1)}ms`);
        console.log(`平均注视时间: ${this.performanceMetrics.averageGazeTime.toFixed(1)}ms`);
        console.log(`平均翻译准确率: ${this.performanceMetrics.averageTranslationAccuracy.toFixed(1)}%`);

        // 场景详细结果
        console.log('\n📝 场景详细结果:');
        for (const result of this.testResults) {
            const status = result.success ? '✅' : '❌';
            const accuracy = result.translationAccuracy ? ` (准确率: ${result.translationAccuracy.toFixed(1)}%)` : '';
            
            console.log(`${status} ${result.scenario} - ${result.totalTime}ms${accuracy}`);
            
            if (!result.success && result.error) {
                console.log(`     错误: ${result.error}`);
            }
        }

        // 场景类型分析
        console.log('\n🎭 场景类型分析:');
        const contextStats = {};
        for (const result of this.testResults) {
            if (!contextStats[result.context]) {
                contextStats[result.context] = { total: 0, success: 0 };
            }
            contextStats[result.context].total++;
            if (result.success) {
                contextStats[result.context].success++;
            }
        }

        for (const [context, stats] of Object.entries(contextStats)) {
            const successRate = (stats.success / stats.total * 100).toFixed(1);
            console.log(`${context}: ${stats.success}/${stats.total} (${successRate}%)`);
        }

        // 综合评价
        console.log('\n🏆 综合评价:');
        const overallSuccessRate = (successCount / this.scenarios.length) * 100;
        const avgAccuracy = this.performanceMetrics.averageTranslationAccuracy;

        if (overallSuccessRate >= 90 && avgAccuracy >= 85) {
            console.log('🌟 优秀: 系统在各种真实VR场景下表现出色');
        } else if (overallSuccessRate >= 80 && avgAccuracy >= 70) {
            console.log('👍 良好: 系统基本满足VR翻译需求，有改进空间');
        } else if (overallSuccessRate >= 60 && avgAccuracy >= 60) {
            console.log('⚠️ 一般: 系统可以基本工作，但需要优化');
        } else {
            console.log('❌ 需要改进: 系统在真实场景下表现不佳，需要重点优化');
        }

        // 建议
        console.log('\n💡 优化建议:');
        if (this.performanceMetrics.averageResponseTime > 2000) {
            console.log('- 响应时间较长，建议优化OCR和翻译处理速度');
        }
        if (this.performanceMetrics.averageTranslationAccuracy < 80) {
            console.log('- 翻译准确率有待提升，建议优化翻译模型或上下文处理');
        }
        if (overallSuccessRate < 90) {
            console.log('- 系统稳定性需要加强，建议增加错误处理和重试机制');
        }

        // 保存详细报告
        this.saveScenarioReport();
    }

    // 保存详细报告到文件
    saveScenarioReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(__dirname, '../reports', `real_scenario_test_${timestamp}.json`);
        
        const report = {
            timestamp: new Date().toISOString(),
            testType: 'real_scenario',
            summary: {
                totalScenarios: this.scenarios.length,
                successfulScenarios: this.testResults.filter(r => r.success).length,
                successRate: (this.testResults.filter(r => r.success).length / this.scenarios.length) * 100
            },
            performanceMetrics: this.performanceMetrics,
            scenarioResults: this.testResults,
            scenarios: this.scenarios,
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
    const tester = new RealScenarioTester();
    
    try {
        const results = await tester.runAllScenarios();
        
        console.log('\n🎯 真实场景测试完成');
        console.log(`最终成功率: ${results.successRate.toFixed(1)}%`);
        
        // 根据结果设置退出码
        process.exit(results.successRate >= 80 ? 0 : 1);
        
    } catch (error) {
        console.error('❌ 真实场景测试失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = RealScenarioTester;