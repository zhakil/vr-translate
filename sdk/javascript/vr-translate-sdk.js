/**
 * VR Translation Service JavaScript SDK
 * 
 * 完整的外部调用客户端SDK，支持REST API和WebSocket实时通信
 * 
 * @version 1.0.0
 * @author VR Translation Team
 */

class VRTranslateSDK {
    constructor(options = {}) {
        this.config = {
            baseURL: options.baseURL || 'http://localhost:8080',
            websocketURL: options.websocketURL || 'ws://localhost:8081',
            timeout: options.timeout || 10000,
            retries: options.retries || 3,
            debug: options.debug || false
        };
        
        this.ws = null;
        this.wsListeners = new Map();
        this.requestId = 0;
        
        if (this.config.debug) {
            console.log('[VRTranslateSDK] SDK初始化完成', this.config);
        }
    }

    // ===============================
    // REST API方法
    // ===============================

    /**
     * 翻译文本
     * @param {string} text 要翻译的文本
     * @param {string} sourceLang 源语言代码，默认'auto'
     * @param {string} targetLang 目标语言代码，默认'zh-CN'
     * @returns {Promise<Object>} 翻译结果
     */
    async translate(text, sourceLang = 'auto', targetLang = 'zh-CN') {
        try {
            const response = await this._request('POST', '/api/translate', {
                text,
                sourceLang,
                targetLang
            });
            
            if (this.config.debug) {
                console.log('[VRTranslateSDK] 翻译完成:', response.data);
            }
            
            return response.data;
        } catch (error) {
            console.error('[VRTranslateSDK] 翻译失败:', error);
            throw error;
        }
    }

    /**
     * 批量翻译
     * @param {string[]} texts 要翻译的文本数组
     * @param {string} sourceLang 源语言代码，默认'auto'
     * @param {string} targetLang 目标语言代码，默认'zh-CN'
     * @returns {Promise<Object>} 批量翻译结果
     */
    async batchTranslate(texts, sourceLang = 'auto', targetLang = 'zh-CN') {
        if (!Array.isArray(texts) || texts.length === 0) {
            throw new Error('texts must be a non-empty array');
        }

        if (texts.length > 100) {
            throw new Error('Maximum 100 texts allowed for batch translation');
        }

        try {
            const response = await this._request('POST', '/api/translate/batch', {
                texts,
                sourceLang,
                targetLang
            });
            
            if (this.config.debug) {
                console.log('[VRTranslateSDK] 批量翻译完成:', response.data);
            }
            
            return response.data;
        } catch (error) {
            console.error('[VRTranslateSDK] 批量翻译失败:', error);
            throw error;
        }
    }

    /**
     * OCR识别图片文字
     * @param {string|File} image Base64编码的图片或File对象
     * @param {string} lang 识别语言，默认'auto'
     * @returns {Promise<Object>} OCR识别结果
     */
    async ocr(image, lang = 'auto') {
        try {
            let imageData = image;
            
            // 如果是File对象，转换为base64
            if (image instanceof File) {
                imageData = await this._fileToBase64(image);
            }
            
            const response = await this._request('POST', '/api/ocr', {
                image: imageData,
                lang
            });
            
            if (this.config.debug) {
                console.log('[VRTranslateSDK] OCR识别完成:', response.data);
            }
            
            return response.data;
        } catch (error) {
            console.error('[VRTranslateSDK] OCR识别失败:', error);
            throw error;
        }
    }

    /**
     * OCR识别后翻译
     * @param {string|File} image Base64编码的图片或File对象
     * @param {string} sourceLang 源语言代码，默认'auto'
     * @param {string} targetLang 目标语言代码，默认'zh-CN'
     * @returns {Promise<Object>} OCR+翻译结果
     */
    async ocrTranslate(image, sourceLang = 'auto', targetLang = 'zh-CN') {
        try {
            let imageData = image;
            
            // 如果是File对象，转换为base64
            if (image instanceof File) {
                imageData = await this._fileToBase64(image);
            }
            
            const response = await this._request('POST', '/api/ocr-translate', {
                image: imageData,
                sourceLang,
                targetLang
            });
            
            if (this.config.debug) {
                console.log('[VRTranslateSDK] OCR+翻译完成:', response.data);
            }
            
            return response.data;
        } catch (error) {
            console.error('[VRTranslateSDK] OCR+翻译失败:', error);
            throw error;
        }
    }

    /**
     * 获取支持的语言列表
     * @returns {Promise<Object>} 语言列表
     */
    async getLanguages() {
        try {
            const response = await this._request('GET', '/api/languages');
            return response.data;
        } catch (error) {
            console.error('[VRTranslateSDK] 获取语言列表失败:', error);
            throw error;
        }
    }

    /**
     * 获取服务统计信息
     * @returns {Promise<Object>} 统计信息
     */
    async getStats() {
        try {
            const response = await this._request('GET', '/api/stats');
            return response.data;
        } catch (error) {
            console.error('[VRTranslateSDK] 获取统计信息失败:', error);
            throw error;
        }
    }

    // ===============================
    // WebSocket方法
    // ===============================

    /**
     * 连接WebSocket服务器
     * @returns {Promise<void>}
     */
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.config.websocketURL);
                
                this.ws.onopen = () => {
                    if (this.config.debug) {
                        console.log('[VRTranslateSDK] WebSocket连接已建立');
                    }
                    resolve();
                };
                
                this.ws.onerror = (error) => {
                    console.error('[VRTranslateSDK] WebSocket连接错误:', error);
                    reject(error);
                };
                
                this.ws.onclose = () => {
                    if (this.config.debug) {
                        console.log('[VRTranslateSDK] WebSocket连接已关闭');
                    }
                    this.ws = null;
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this._handleWebSocketMessage(message);
                    } catch (error) {
                        console.error('[VRTranslateSDK] 解析WebSocket消息失败:', error);
                    }
                };
                
            } catch (error) {
                console.error('[VRTranslateSDK] 创建WebSocket连接失败:', error);
                reject(error);
            }
        });
    }

    /**
     * 断开WebSocket连接
     */
    disconnectWebSocket() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.wsListeners.clear();
        }
    }

    /**
     * 发送眼动数据
     * @param {Object} gazeData 眼动数据
     */
    sendGazeData(gazeData) {
        this._sendWebSocketMessage('gaze', gazeData);
    }

    /**
     * 发送截图请求
     * @param {Object} screenshotData 截图数据
     */
    sendScreenshot(screenshotData) {
        this._sendWebSocketMessage('screenshot', screenshotData);
    }

    /**
     * 发送配置更新
     * @param {Object} config 配置数据
     */
    sendConfig(config) {
        this._sendWebSocketMessage('config', config);
    }

    /**
     * 监听WebSocket消息
     * @param {string} type 消息类型
     * @param {Function} callback 回调函数
     */
    onWebSocketMessage(type, callback) {
        if (!this.wsListeners.has(type)) {
            this.wsListeners.set(type, []);
        }
        this.wsListeners.get(type).push(callback);
    }

    /**
     * 移除WebSocket消息监听器
     * @param {string} type 消息类型
     * @param {Function} callback 回调函数
     */
    offWebSocketMessage(type, callback) {
        if (this.wsListeners.has(type)) {
            const listeners = this.wsListeners.get(type);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    // ===============================
    // 内部辅助方法
    // ===============================

    /**
     * 发送HTTP请求
     * @private
     */
    async _request(method, path, data = null) {
        const url = `${this.config.baseURL}${path}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        // 重试机制
        for (let attempt = 1; attempt <= this.config.retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
                
                options.signal = controller.signal;
                
                const response = await fetch(url, options);
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.message || '请求失败');
                }
                
                return result;
                
            } catch (error) {
                if (attempt === this.config.retries) {
                    throw error;
                }
                
                if (this.config.debug) {
                    console.warn(`[VRTranslateSDK] 请求失败，正在重试 ${attempt}/${this.config.retries}:`, error.message);
                }
                
                // 等待后重试
                await this._delay(Math.pow(2, attempt) * 1000);
            }
        }
    }

    /**
     * 发送WebSocket消息
     * @private
     */
    _sendWebSocketMessage(type, payload) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket未连接');
        }
        
        const message = {
            type,
            payload,
            id: ++this.requestId,
            timestamp: Date.now()
        };
        
        this.ws.send(JSON.stringify(message));
        
        if (this.config.debug) {
            console.log('[VRTranslateSDK] 发送WebSocket消息:', message);
        }
    }

    /**
     * 处理WebSocket消息
     * @private
     */
    _handleWebSocketMessage(message) {
        if (this.config.debug) {
            console.log('[VRTranslateSDK] 收到WebSocket消息:', message);
        }
        
        const { type } = message;
        if (this.wsListeners.has(type)) {
            this.wsListeners.get(type).forEach(callback => {
                try {
                    callback(message);
                } catch (error) {
                    console.error('[VRTranslateSDK] WebSocket消息处理错误:', error);
                }
            });
        }
    }

    /**
     * 将File对象转换为base64
     * @private
     */
    _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * 延迟执行
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 导出SDK类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VRTranslateSDK;
} else if (typeof window !== 'undefined') {
    window.VRTranslateSDK = VRTranslateSDK;
}

// 使用示例：
/*
// 初始化SDK
const sdk = new VRTranslateSDK({
    baseURL: 'http://localhost:8080',
    websocketURL: 'ws://localhost:8081',
    debug: true
});

// REST API调用示例
async function example() {
    try {
        // 翻译文本
        const result = await sdk.translate('Hello World', 'en', 'zh-CN');
        console.log('翻译结果:', result);
        
        // 批量翻译
        const batchResult = await sdk.batchTranslate([
            'Hello', 'World', 'Good morning'
        ], 'en', 'zh-CN');
        console.log('批量翻译结果:', batchResult);
        
        // OCR识别
        const ocrResult = await sdk.ocr('data:image/png;base64,iVBORw0K...');
        console.log('OCR结果:', ocrResult);
        
        // OCR+翻译
        const ocrTranslateResult = await sdk.ocrTranslate('data:image/png;base64,iVBORw0K...', 'en', 'zh-CN');
        console.log('OCR+翻译结果:', ocrTranslateResult);
        
        // 获取支持的语言
        const languages = await sdk.getLanguages();
        console.log('支持的语言:', languages);
        
    } catch (error) {
        console.error('调用失败:', error);
    }
}

// WebSocket调用示例
async function websocketExample() {
    try {
        // 连接WebSocket
        await sdk.connectWebSocket();
        
        // 监听翻译结果
        sdk.onWebSocketMessage('translation_result', (message) => {
            console.log('收到翻译结果:', message.payload);
        });
        
        // 发送眼动数据
        sdk.sendGazeData({
            x: 100,
            y: 200,
            timestamp: Date.now(),
            confidence: 0.95
        });
        
        // 发送截图
        sdk.sendScreenshot({
            image: 'data:image/png;base64,iVBORw0K...',
            sourceLang: 'en',
            targetLang: 'zh-CN'
        });
        
    } catch (error) {
        console.error('WebSocket操作失败:', error);
    }
}
*/