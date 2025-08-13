/**
 * Unified type definitions for the VR Translation backend
 */

// Base message types
export interface BaseMessage {
    type: string;
    payload: any;
    timestamp?: number;
    clientId?: string;
}

// WebSocket message types
export interface WebSocketMessage extends BaseMessage {
    type: 'gaze' | 'screenshot' | 'config' | 'heartbeat' | 'client_info' | 'authenticate' | 'memory_check' | 'memory_create' | 'memory_update' | 'memory_query' | 'memory_stats';
}

// Gaze data types
export interface GazeData {
    x: number;
    y: number;
    confidence?: number;
    timestamp?: number;
    deviceType?: 'eye_tracker' | 'head_gaze' | 'mouse';
}

export interface GazeConfig {
    stabilityThreshold?: number;
    timeThreshold?: number;
    headGazeMode?: boolean;
    headGazeStabilityThreshold?: number;
    headGazeTimeThreshold?: number;
}

// Screenshot types
export interface ScreenshotPayload {
    image: string; // Base64 encoded
    sourceLang: string;
    targetLang: string;
    gazePosition?: GazeData;
    metadata?: ScreenshotMetadata;
}

export interface ScreenshotMetadata {
    width: number;
    height: number;
    format: 'png' | 'jpg' | 'webp';
    quality?: number;
    deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
    type: 'quest3' | 'quest2' | 'desktop' | 'mobile';
    os?: string;
    browser?: string;
    resolution?: { width: number; height: number };
}

// Translation types
export interface TranslationRequest {
    text: string;
    sourceLang: string;
    targetLang: string;
    context?: string;
    priority?: 'low' | 'normal' | 'high';
}

export interface TranslationResult {
    original: string;
    translated: string;
    confidence?: number;
    engine: string;
    processingTime: number;
    cached: boolean;
}

export interface BatchTranslationRequest {
    texts: string[];
    sourceLang: string;
    targetLang: string;
    context?: string;
}

// OCR types
export interface OCRRequest {
    imageBuffer: Buffer;
    language?: string;
    options?: OCROptions;
}

export interface OCROptions {
    psm?: number; // Page segmentation mode
    oem?: number; // OCR engine mode
    whitelist?: string; // Character whitelist
    blacklist?: string; // Character blacklist
}

export interface OCRResult {
    text: string;
    confidence: number;
    processingTime: number;
    language?: string;
    boundingBoxes?: BoundingBox[];
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    confidence: number;
}

// Service response types
export interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: ServiceError;
    metadata?: ResponseMetadata;
}

export interface ServiceError {
    code: string;
    message: string;
    details?: any;
    stack?: string;
}

export interface ResponseMetadata {
    processingTime: number;
    requestId: string;
    timestamp: number;
    version: string;
}

// Configuration types
export interface ServerConfig {
    server: {
        port: number;
        websocketPort: number;
        host?: string;
        ssl?: boolean;
    };
    translation: {
        engine: 'deepl' | 'google' | 'mock';
        apiKey?: string;
        cacheSize?: number;
        timeout?: number;
    };
    ocr: {
        engine: 'tesseract' | 'google' | 'aws' | 'mock';
        language?: string;
        options?: OCROptions;
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        serviceName?: string;
        format?: 'json' | 'simple';
    };
    gaze: GazeConfig;
}

// Performance monitoring types
export interface PerformanceMetrics {
    requestCount: number;
    averageProcessingTime: number;
    errorRate: number;
    cacheHitRate: number;
    activeConnections: number;
    memoryUsage: {
        heapUsed: number;
        heapTotal: number;
        external: number;
    };
}

// Client connection types
export interface ClientConnection {
    id: string;
    websocket: any; // WebSocket instance
    connectedAt: number;
    lastActivity: number;
    deviceInfo?: DeviceInfo;
    isActive: boolean;
    userId?: string; // Set after authentication
}

// Event types
export interface SystemEvent {
    type: 'client_connected' | 'client_disconnected' | 'translation_completed' | 'error_occurred';
    payload: any;
    timestamp: number;
    source: string;
}

// Health check types
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
        websocket: ServiceHealth;
        http: ServiceHealth;
        translation: ServiceHealth;
        ocr: ServiceHealth;
        database?: ServiceHealth;
    };
    timestamp: number;
    uptime: number;
}

export interface ServiceHealth {
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    lastCheck: number;
    details?: any;
}

// Utility types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LanguageCode = string; // ISO 639-1 language codes
export type EventHandler<T = any> = (event: T) => void | Promise<void>;

// Type guards
export function isGazeData(data: any): data is GazeData {
    return typeof data === 'object' && 
           typeof data.x === 'number' && 
           typeof data.y === 'number';
}

export function isScreenshotPayload(data: any): data is ScreenshotPayload {
    return typeof data === 'object' && 
           typeof data.image === 'string' && 
           typeof data.sourceLang === 'string' && 
           typeof data.targetLang === 'string';
}

export function isWebSocketMessage(data: any): data is WebSocketMessage {
    return typeof data === 'object' && 
           typeof data.type === 'string' && 
           data.payload !== undefined;
}