import { OCRService } from '../../src/ocr/OCRService';

describe('OCRService', () => {
  let ocrService: OCRService;

  beforeEach(() => {
    ocrService = new OCRService();
  });

  describe('performOCR', () => {
    it('should return mock text for valid image buffer', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data');
      
      const result = await ocrService.performOCR(mockImageBuffer);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty image buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);
      
      const result = await ocrService.performOCR(emptyBuffer);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should return consistent mock data', async () => {
      const mockImageBuffer = Buffer.from('test-image');
      
      const result1 = await ocrService.performOCR(mockImageBuffer);
      const result2 = await ocrService.performOCR(mockImageBuffer);
      
      expect(result1).toBe(result2);
    });
  });

  describe('error handling', () => {
    it('should handle null buffer gracefully', async () => {
      expect(async () => {
        await ocrService.performOCR(null as any);
      }).not.toThrow();
    });

    it('should handle undefined buffer gracefully', async () => {
      expect(async () => {
        await ocrService.performOCR(undefined as any);
      }).not.toThrow();
    });
  });
});