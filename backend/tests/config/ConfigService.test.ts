import configService from '../../src/config/ConfigService';

describe('ConfigService', () => {
  describe('get', () => {
    it('should return server configuration', () => {
      const serverConfig = configService.get('server');
      
      expect(serverConfig).toBeDefined();
      expect(typeof serverConfig).toBe('object');
      expect(serverConfig).toHaveProperty('port');
      expect(serverConfig).toHaveProperty('websocketPort');
    });

    it('should return logging configuration', () => {
      const loggingConfig = configService.get('logging');
      
      expect(loggingConfig).toBeDefined();
      expect(loggingConfig).toHaveProperty('level');
      expect(loggingConfig).toHaveProperty('serviceName');
    });

    it('should return OCR configuration', () => {
      const ocrConfig = configService.get('ocr');
      
      expect(ocrConfig).toBeDefined();
      expect(ocrConfig).toHaveProperty('engine');
      expect(ocrConfig).toHaveProperty('timeout');
    });

    it('should return translation configuration', () => {
      const translationConfig = configService.get('translation');
      
      expect(translationConfig).toBeDefined();
      expect(translationConfig).toHaveProperty('engine');
      expect(translationConfig).toHaveProperty('timeout');
    });
  });

  describe('set', () => {
    it('should update configuration value', () => {
      const originalValue = configService.get('logging.level');
      const newValue = 'debug';
      
      configService.set('logging.level', newValue);
      const updatedValue = configService.get('logging.level');
      
      expect(updatedValue).toBe(newValue);
      
      // Restore original value
      configService.set('logging.level', originalValue);
    });
  });

  describe('has', () => {
    it('should return true for existing configuration keys', () => {
      expect(configService.has('server')).toBe(true);
      expect(configService.has('logging')).toBe(true);
      expect(configService.has('ocr')).toBe(true);
      expect(configService.has('translation')).toBe(true);
    });

    it('should return false for non-existing configuration keys', () => {
      expect(configService.has('nonexistent')).toBe(false);
      expect(configService.has('server.nonexistent')).toBe(false);
    });
  });
});