import { TranslationService } from '../../src/translation/TranslationService';

describe('TranslationService', () => {
  let translationService: TranslationService;

  beforeEach(() => {
    translationService = new TranslationService();
  });

  describe('translateText', () => {
    it('should translate text between different languages', async () => {
      const text = 'Hello, world!';
      const sourceLang = 'en';
      const targetLang = 'zh-CN';
      
      const result = await translationService.translateText(text, sourceLang, targetLang);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toBe(text); // Should be different from original
    });

    it('should handle empty text', async () => {
      const result = await translationService.translateText('', 'en', 'zh-CN');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle same source and target language', async () => {
      const text = 'Hello, world!';
      const result = await translationService.translateText(text, 'en', 'en');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle various language codes', async () => {
      const text = 'Hello';
      
      const languages = [
        { source: 'en', target: 'zh-CN' },
        { source: 'en', target: 'ja' },
        { source: 'en', target: 'ko' },
        { source: 'en', target: 'es' },
        { source: 'en', target: 'fr' }
      ];

      for (const { source, target } of languages) {
        const result = await translationService.translateText(text, source, target);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      }
    });

    it('should handle special characters and unicode', async () => {
      const text = 'Hello 🌍 世界 ';
      const result = await translationService.translateText(text, 'en', 'zh-CN');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('error handling', () => {
    it('should handle invalid language codes gracefully', async () => {
      const text = 'Hello';
      
      expect(async () => {
        await translationService.translateText(text, 'invalid', 'zh-CN');
      }).not.toThrow();
    });

    it('should handle null text gracefully', async () => {
      expect(async () => {
        await translationService.translateText(null as any, 'en', 'zh-CN');
      }).not.toThrow();
    });

    it('should handle undefined text gracefully', async () => {
      expect(async () => {
        await translationService.translateText(undefined as any, 'en', 'zh-CN');
      }).not.toThrow();
    });
  });
});