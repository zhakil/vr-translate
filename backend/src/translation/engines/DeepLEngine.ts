import { createLogger } from '../../logging/Logger';
import configService from '../../config/ConfigService';
import { ITranslationEngine } from '../TranslationService';
import * as deepl from 'deepl-node';

/**
 * DeepL翻译引擎
 * 使用DeepL API提供高质量的机器翻译服务
 */
export class DeepLEngine implements ITranslationEngine {
    private translator: deepl.Translator;
    private logger = createLogger(configService);

    constructor() {
        const apiKey = process.env.DEEPL_API_KEY || configService.get<string>('deepl.apiKey');
        
        if (!apiKey) {
            throw new Error('DeepL API key not configured');
        }

        this.translator = new deepl.Translator(apiKey);
        this.logger.info('DeepL翻译引擎初始化完成');
    }

    /**
     * 翻译文本
     * @param text 要翻译的文本
     * @param sourceLang 源语言代码
     * @param targetLang 目标语言代码
     * @returns 翻译结果
     */
    async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
        try {
            this.logger.debug(`DeepL翻译请求: "${text}" (${sourceLang} → ${targetLang})`);

            // 处理语言代码映射
            const deepLSourceLang = this.mapToDeepLLanguage(sourceLang, true);
            const deepLTargetLang = this.mapToDeepLLanguage(targetLang, false);

            this.logger.debug(`映射后的语言代码: ${deepLSourceLang || 'auto'} → ${deepLTargetLang}`);

            // 调用DeepL API (使用any类型避免类型错误)
            const result = await this.translator.translateText(
                text,
                deepLSourceLang as any,
                deepLTargetLang as any
            );

            // 处理结果 (使用any类型避免类型错误)
            const translatedText = Array.isArray(result) 
                ? (result as any)[0].text 
                : (result as any).text;
            
            this.logger.info(`DeepL翻译成功: "${text}" → "${translatedText}"`);
            return translatedText;

        } catch (error: any) {
            this.logger.error('DeepL翻译失败:', error);
            
            // 提供更友好的错误信息
            const errorMessage = error?.message || String(error);
            if (errorMessage.includes('quota')) {
                throw new Error('DeepL API配额已用完，请检查您的订阅');
            } else if (errorMessage.includes('auth')) {
                throw new Error('DeepL API认证失败，请检查API密钥');
            } else if (errorMessage.includes('language')) {
                throw new Error(`不支持的语言组合: ${sourceLang} → ${targetLang}`);
            }
            
            throw new Error(`DeepL翻译服务暂时不可用: ${errorMessage}`);
        }
    }

    /**
     * 批量翻译
     * @param texts 要翻译的文本数组
     * @param sourceLang 源语言代码
     * @param targetLang 目标语言代码
     * @returns 翻译结果数组
     */
    async batchTranslate(texts: string[], sourceLang: string, targetLang: string): Promise<string[]> {
        try {
            this.logger.info(`DeepL批量翻译: ${texts.length}条文本 (${sourceLang} → ${targetLang})`);

            // 处理语言代码映射
            const deepLSourceLang = this.mapToDeepLLanguage(sourceLang, true);
            const deepLTargetLang = this.mapToDeepLLanguage(targetLang, false);

            // 调用DeepL批量翻译API
            const results = await this.translator.translateText(
                texts,
                deepLSourceLang as any,
                deepLTargetLang as any
            );

            // 处理结果
            const translatedTexts = Array.isArray(results) 
                ? (results as any[]).map((result: any) => result.text)
                : [(results as any).text];

            this.logger.info(`DeepL批量翻译成功: ${translatedTexts.length}条结果`);
            return translatedTexts;

        } catch (error: any) {
            this.logger.error('DeepL批量翻译失败:', error);
            
            // 批量翻译失败时，逐个翻译
            this.logger.info('尝试逐个翻译...');
            const results: string[] = [];
            
            for (const text of texts) {
                try {
                    const translated = await this.translate(text, sourceLang, targetLang);
                    results.push(translated);
                } catch (err) {
                    this.logger.warn(`单个文本翻译失败: "${text}"`);
                    results.push(text); // 翻译失败时返回原文
                }
            }
            
            return results;
        }
    }

    /**
     * 检查API使用情况
     * @returns API使用统计
     */
    async getUsage(): Promise<any> {
        try {
            const usage = await this.translator.getUsage();
            this.logger.debug('DeepL API使用情况:', {
                characterCount: (usage as any).character?.count,
                characterLimit: (usage as any).character?.limit
            });
            return usage;
        } catch (error) {
            this.logger.error('获取DeepL使用情况失败:', error);
            throw error;
        }
    }

    /**
     * 将通用语言代码映射到DeepL语言代码
     * @param langCode 通用语言代码
     * @param isSource 是否为源语言
     * @returns DeepL语言代码
     */
    private mapToDeepLLanguage(langCode: string, isSource: boolean): string | null {
        // 处理自动检测
        if (langCode === 'auto' || langCode === 'detect') {
            return isSource ? null : 'ZH';
        }

        // 语言代码映射表
        const languageMap: { [key: string]: { source: string, target: string } } = {
            'zh-CN': { source: 'ZH', target: 'ZH' },
            'zh': { source: 'ZH', target: 'ZH' },
            'en': { source: 'EN', target: 'EN-US' },
            'de': { source: 'DE', target: 'DE' },
            'fr': { source: 'FR', target: 'FR' },
            'it': { source: 'IT', target: 'IT' },
            'ja': { source: 'JA', target: 'JA' },
            'es': { source: 'ES', target: 'ES' },
            'nl': { source: 'NL', target: 'NL' },
            'pl': { source: 'PL', target: 'PL' },
            'pt': { source: 'PT', target: 'PT-PT' },
            'pt-BR': { source: 'PT', target: 'PT-BR' },
            'ru': { source: 'RU', target: 'RU' },
            'ko': { source: 'KO', target: 'KO' },
            'sv': { source: 'SV', target: 'SV' },
            'da': { source: 'DA', target: 'DA' },
            'fi': { source: 'FI', target: 'FI' },
            'cs': { source: 'CS', target: 'CS' },
            'et': { source: 'ET', target: 'ET' },
            'hu': { source: 'HU', target: 'HU' },
            'lv': { source: 'LV', target: 'LV' },
            'lt': { source: 'LT', target: 'LT' },
            'sk': { source: 'SK', target: 'SK' },
            'sl': { source: 'SL', target: 'SL' },
            'bg': { source: 'BG', target: 'BG' },
            'ro': { source: 'RO', target: 'RO' },
            'el': { source: 'EL', target: 'EL' }
        };

        const mapping = languageMap[langCode.toLowerCase()];
        if (!mapping) {
            throw new Error(`不支持的语言代码: ${langCode}`);
        }

        return isSource ? mapping.source : mapping.target;
    }
}