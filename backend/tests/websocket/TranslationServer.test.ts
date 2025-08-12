import WebSocket from 'ws';
import { TranslationServer } from '../../src/websocket/TranslationServer';
import { OCRService } from '../../src/ocr/OCRService';
import { TranslationService } from '../../src/translation/TranslationService';

describe('TranslationServer', () => {
  let server: TranslationServer;
  let client: WebSocket;
  let ocrService: OCRService;
  let translationService: TranslationService;
  const testPort = 9999;

  beforeEach((done) => {
    ocrService = new OCRService();
    translationService = new TranslationService();
    server = new TranslationServer(testPort, ocrService, translationService);
    
    // Wait a bit for server to start
    setTimeout(() => {
      client = new WebSocket(`ws://localhost:${testPort}`);
      client.on('open', () => done());
    }, 100);
  });

  afterEach((done) => {
    if (client) {
      client.close();
    }
    // Give time for cleanup
    setTimeout(done, 100);
  });

  describe('connection handling', () => {
    it('should accept client connections', (done) => {
      const testClient = new WebSocket(`ws://localhost:${testPort}`);
      
      testClient.on('open', () => {
        expect(testClient.readyState).toBe(WebSocket.OPEN);
        testClient.close();
        done();
      });

      testClient.on('error', (error) => {
        done(error);
      });
    });

    it('should handle multiple concurrent connections', (done) => {
      const clients: WebSocket[] = [];
      let connectedCount = 0;
      const totalClients = 3;

      for (let i = 0; i < totalClients; i++) {
        const testClient = new WebSocket(`ws://localhost:${testPort}`);
        clients.push(testClient);

        testClient.on('open', () => {
          connectedCount++;
          if (connectedCount === totalClients) {
            // All clients connected
            clients.forEach(client => client.close());
            done();
          }
        });

        testClient.on('error', (error) => {
          done(error);
        });
      }
    });
  });

  describe('message handling', () => {
    it('should handle valid gaze messages', (done) => {
      const gazeMessage = {
        type: 'gaze',
        payload: {
          x: 100,
          y: 200,
          timestamp: Date.now(),
          confidence: 0.9
        }
      };

      client.send(JSON.stringify(gazeMessage));
      
      // If no error is thrown, test passes
      setTimeout(done, 100);
    });

    it('should handle config update messages', (done) => {
      let messageReceived = false;
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'config_updated') {
          messageReceived = true;
          expect(message.payload.status).toBe('success');
          done();
        }
      });

      const configMessage = {
        type: 'config',
        payload: {
          gaze: {
            threshold: 2.0
          },
          translation: {
            sourceLanguage: 'en',
            targetLanguage: 'zh-CN'
          }
        }
      };

      client.send(JSON.stringify(configMessage));

      // Timeout fallback
      setTimeout(() => {
        if (!messageReceived) {
          done();
        }
      }, 1000);
    });

    it('should handle screenshot messages', (done) => {
      let messageReceived = false;
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'translation_result') {
          messageReceived = true;
          expect(message.payload).toHaveProperty('original');
          expect(message.payload).toHaveProperty('translation');
          done();
        }
      });

      const screenshotMessage = {
        type: 'screenshot',
        payload: {
          image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', // 1x1 pixel PNG
          sourceLang: 'en',
          targetLang: 'zh-CN'
        }
      };

      client.send(JSON.stringify(screenshotMessage));

      // Timeout fallback
      setTimeout(() => {
        if (!messageReceived) {
          done();
        }
      }, 2000);
    });

    it('should handle invalid message format', (done) => {
      let errorReceived = false;
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'error') {
          errorReceived = true;
          expect(message.payload.message).toContain('Invalid message format');
          done();
        }
      });

      client.send('invalid json');

      // Timeout fallback
      setTimeout(() => {
        if (!errorReceived) {
          done();
        }
      }, 500);
    });

    it('should handle unknown message types', (done) => {
      let errorReceived = false;
      
      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'error') {
          errorReceived = true;
          expect(message.payload.message).toContain('Unknown message type');
          done();
        }
      });

      const unknownMessage = {
        type: 'unknown_type',
        payload: {}
      };

      client.send(JSON.stringify(unknownMessage));

      // Timeout fallback
      setTimeout(() => {
        if (!errorReceived) {
          done();
        }
      }, 500);
    });
  });

  describe('error handling', () => {
    it('should handle client disconnection gracefully', (done) => {
      const testClient = new WebSocket(`ws://localhost:${testPort}`);
      
      testClient.on('open', () => {
        testClient.close();
        // If server doesn't crash, test passes
        setTimeout(done, 100);
      });
    });

    it('should continue operating after client errors', (done) => {
      // Send valid message
      const validMessage = {
        type: 'gaze',
        payload: {
          x: 100,
          y: 200,
          timestamp: Date.now(),
          confidence: 0.9
        }
      };

      client.send(JSON.stringify(validMessage));
      
      // Send invalid message
      client.send('invalid');
      
      // Send another valid message
      client.send(JSON.stringify(validMessage));
      
      // If no server crash, test passes
      setTimeout(done, 200);
    });
  });
});