import { GazeAnalyzer, GazeData } from '../../src/gaze-analyzer/GazeAnalyzer';

describe('GazeAnalyzer', () => {
  let gazeAnalyzer: GazeAnalyzer;
  let mockCallback: jest.Mock;

  beforeEach(() => {
    mockCallback = jest.fn();
    gazeAnalyzer = new GazeAnalyzer(mockCallback);
  });

  describe('processGaze', () => {
    it('should process valid gaze data', () => {
      const gazeData: GazeData = {
        x: 100,
        y: 200,
        timestamp: Date.now(),
        confidence: 0.9
      };

      expect(() => {
        gazeAnalyzer.processGaze(gazeData);
      }).not.toThrow();
    });

    it('should handle multiple gaze data points', () => {
      const gazeDataPoints: GazeData[] = [
        { x: 100, y: 200, timestamp: Date.now(), confidence: 0.9 },
        { x: 105, y: 205, timestamp: Date.now() + 100, confidence: 0.8 },
        { x: 110, y: 210, timestamp: Date.now() + 200, confidence: 0.85 }
      ];

      gazeDataPoints.forEach(gazeData => {
        expect(() => {
          gazeAnalyzer.processGaze(gazeData);
        }).not.toThrow();
      });
    });

    it('should trigger callback when conditions are met', (done) => {
      const mockCallback = jest.fn().mockImplementation(() => {
        expect(mockCallback).toHaveBeenCalled();
        done();
      });

      const gazeAnalyzer = new GazeAnalyzer(mockCallback);
      
      // Simulate focused gaze for trigger duration
      const baseTime = Date.now();
      const gazeData: GazeData = {
        x: 100,
        y: 200,
        timestamp: baseTime,
        confidence: 0.9
      };

      // Process multiple gaze points at same location
      for (let i = 0; i < 10; i++) {
        gazeAnalyzer.processGaze({
          ...gazeData,
          timestamp: baseTime + (i * 100)
        });
      }
    });

    it('should handle low confidence gaze data', () => {
      const gazeData: GazeData = {
        x: 100,
        y: 200,
        timestamp: Date.now(),
        confidence: 0.3
      };

      expect(() => {
        gazeAnalyzer.processGaze(gazeData);
      }).not.toThrow();
    });
  });

  describe('updateConfig', () => {
    it('should update gaze configuration', () => {
      const newConfig = {
        threshold: 2.0,
        radius: 100
      };

      expect(() => {
        gazeAnalyzer.updateConfig(newConfig);
      }).not.toThrow();
    });

    it('should handle empty config object', () => {
      expect(() => {
        gazeAnalyzer.updateConfig({});
      }).not.toThrow();
    });

    it('should handle partial config updates', () => {
      const partialConfig = {
        threshold: 1.5
      };

      expect(() => {
        gazeAnalyzer.updateConfig(partialConfig);
      }).not.toThrow();
    });
  });

  describe('reset', () => {
    it('should reset analyzer state', () => {
      // Process some gaze data first
      const gazeData: GazeData = {
        x: 100,
        y: 200,
        timestamp: Date.now(),
        confidence: 0.9
      };

      gazeAnalyzer.processGaze(gazeData);

      // Reset should not throw
      expect(() => {
        gazeAnalyzer.reset();
      }).not.toThrow();

      // Callback should not have been triggered after reset
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should allow processing after reset', () => {
      const gazeData: GazeData = {
        x: 100,
        y: 200,
        timestamp: Date.now(),
        confidence: 0.9
      };

      gazeAnalyzer.processGaze(gazeData);
      gazeAnalyzer.reset();

      expect(() => {
        gazeAnalyzer.processGaze(gazeData);
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle invalid gaze data gracefully', () => {
      const invalidGazeData = [
        null,
        undefined,
        {},
        { x: 'invalid' },
        { y: 'invalid' },
        { confidence: 'invalid' }
      ];

      invalidGazeData.forEach(data => {
        expect(() => {
          gazeAnalyzer.processGaze(data as any);
        }).not.toThrow();
      });
    });

    it('should handle negative coordinates', () => {
      const gazeData: GazeData = {
        x: -100,
        y: -200,
        timestamp: Date.now(),
        confidence: 0.9
      };

      expect(() => {
        gazeAnalyzer.processGaze(gazeData);
      }).not.toThrow();
    });

    it('should handle future timestamps', () => {
      const gazeData: GazeData = {
        x: 100,
        y: 200,
        timestamp: Date.now() + 1000000, // Future timestamp
        confidence: 0.9
      };

      expect(() => {
        gazeAnalyzer.processGaze(gazeData);
      }).not.toThrow();
    });
  });
});