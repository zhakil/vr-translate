/**
 * Unified error handling system for the VR Translation backend
 */

export enum ErrorCode {
    // General errors
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
    
    // Configuration errors
    CONFIG_ERROR = 'CONFIG_ERROR',
    MISSING_CONFIG = 'MISSING_CONFIG',
    INVALID_CONFIG = 'INVALID_CONFIG',
    
    // Network errors
    CONNECTION_ERROR = 'CONNECTION_ERROR',
    WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
    HTTP_ERROR = 'HTTP_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    
    // Service errors
    TRANSLATION_ERROR = 'TRANSLATION_ERROR',
    OCR_ERROR = 'OCR_ERROR',
    GAZE_ANALYSIS_ERROR = 'GAZE_ANALYSIS_ERROR',
    
    // Resource errors
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
    RESOURCE_UNAVAILABLE = 'RESOURCE_UNAVAILABLE',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    
    // Data errors
    INVALID_IMAGE_FORMAT = 'INVALID_IMAGE_FORMAT',
    INVALID_LANGUAGE_CODE = 'INVALID_LANGUAGE_CODE',
    EMPTY_TEXT = 'EMPTY_TEXT',
    MALFORMED_REQUEST = 'MALFORMED_REQUEST',
    
    // System errors
    UNHANDLED_REJECTION = 'UNHANDLED_REJECTION',
    UNCAUGHT_EXCEPTION = 'UNCAUGHT_EXCEPTION',
}

export interface ErrorContext {
    requestId?: string;
    clientId?: string;
    operation?: string;
    timestamp?: number;
    metadata?: Record<string, any>;
}

export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly context?: ErrorContext;

    constructor(
        message: string,
        code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
        statusCode: number = 500,
        isOperational: boolean = true,
        context?: ErrorContext
    ) {
        super(message);
        
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.context = context;

        // Ensure proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, AppError.prototype);
        
        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    public toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            isOperational: this.isOperational,
            context: this.context,
            stack: this.stack
        };
    }

    public static fromError(error: Error, code?: ErrorCode, context?: ErrorContext): AppError {
        if (error instanceof AppError) {
            return error;
        }

        return new AppError(
            error.message,
            code || ErrorCode.UNKNOWN_ERROR,
            500,
            true,
            context
        );
    }
}

// Specific error classes
export class ValidationError extends AppError {
    constructor(message: string, context?: ErrorContext) {
        super(message, ErrorCode.VALIDATION_ERROR, 400, true, context);
    }
}

export class ConfigurationError extends AppError {
    constructor(message: string, context?: ErrorContext) {
        super(message, ErrorCode.CONFIG_ERROR, 500, true, context);
    }
}

export class TranslationError extends AppError {
    constructor(message: string, context?: ErrorContext) {
        super(message, ErrorCode.TRANSLATION_ERROR, 500, true, context);
    }
}

export class OCRError extends AppError {
    constructor(message: string, context?: ErrorContext) {
        super(message, ErrorCode.OCR_ERROR, 500, true, context);
    }
}

export class NetworkError extends AppError {
    constructor(message: string, context?: ErrorContext) {
        super(message, ErrorCode.CONNECTION_ERROR, 503, true, context);
    }
}

export class TimeoutError extends AppError {
    constructor(message: string, context?: ErrorContext) {
        super(message, ErrorCode.TIMEOUT_ERROR, 408, true, context);
    }
}

export class RateLimitError extends AppError {
    constructor(message: string, context?: ErrorContext) {
        super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, true, context);
    }
}

// Error factory functions
export const createError = {
    validation: (message: string, context?: ErrorContext) => new ValidationError(message, context),
    configuration: (message: string, context?: ErrorContext) => new ConfigurationError(message, context),
    translation: (message: string, context?: ErrorContext) => new TranslationError(message, context),
    ocr: (message: string, context?: ErrorContext) => new OCRError(message, context),
    network: (message: string, context?: ErrorContext) => new NetworkError(message, context),
    timeout: (message: string, context?: ErrorContext) => new TimeoutError(message, context),
    rateLimit: (message: string, context?: ErrorContext) => new RateLimitError(message, context),
};

// Error handling utilities
export class ErrorHandler {
    public static handle(error: Error, context?: ErrorContext): AppError {
        const appError = AppError.fromError(error, undefined, context);
        
        // Log the error based on severity
        if (appError.isOperational) {
            console.warn('Operational error:', appError.toJSON());
        } else {
            console.error('Programming error:', appError.toJSON());
        }

        return appError;
    }

    public static isOperationalError(error: Error): boolean {
        if (error instanceof AppError) {
            return error.isOperational;
        }
        return false;
    }

    public static shouldExitProcess(error: Error): boolean {
        return !ErrorHandler.isOperationalError(error);
    }

    public static createErrorResponse(error: Error, requestId?: string) {
        const appError = error instanceof AppError ? error : AppError.fromError(error);
        
        return {
            success: false,
            error: {
                code: appError.code,
                message: appError.message,
                requestId,
                timestamp: Date.now()
            }
        };
    }
}

// Validation utilities
export class Validator {
    public static isValidLanguageCode(code: string): boolean {
        // Basic validation for ISO 639-1 language codes
        return typeof code === 'string' && /^[a-z]{2}(-[A-Z]{2})?$/.test(code);
    }

    public static isValidImageData(data: string): boolean {
        try {
            // Check if it's valid base64
            const buffer = Buffer.from(data, 'base64');
            return buffer.length > 0;
        } catch {
            return false;
        }
    }

    public static isValidGazeData(data: any): boolean {
        return typeof data === 'object' &&
               typeof data.x === 'number' &&
               typeof data.y === 'number' &&
               data.x >= 0 && data.y >= 0;
    }

    public static validateWebSocketMessage(message: any): void {
        if (!message || typeof message !== 'object') {
            throw new ValidationError('Message must be an object');
        }

        if (!message.type || typeof message.type !== 'string') {
            throw new ValidationError('Message must have a valid type');
        }

        if (message.payload === undefined) {
            throw new ValidationError('Message must have a payload');
        }
    }

    public static validateScreenshotPayload(payload: any): void {
        if (!payload || typeof payload !== 'object') {
            throw new ValidationError('Screenshot payload must be an object');
        }

        if (!payload.image || typeof payload.image !== 'string') {
            throw new ValidationError('Screenshot must contain valid image data');
        }

        if (!Validator.isValidImageData(payload.image)) {
            throw new ValidationError('Invalid image format', { 
                operation: 'validateScreenshot'
            });
        }

        if (!payload.sourceLang || !Validator.isValidLanguageCode(payload.sourceLang)) {
            throw new ValidationError('Invalid source language code');
        }

        if (!payload.targetLang || !Validator.isValidLanguageCode(payload.targetLang)) {
            throw new ValidationError('Invalid target language code');
        }
    }
}

// Async error handling wrapper
export function asyncHandler<T extends any[], R>(
    fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
        try {
            return await fn(...args);
        } catch (error) {
            throw ErrorHandler.handle(error as Error);
        }
    };
}

// Promise timeout wrapper
export function withTimeout<T>(
    promise: Promise<T>, 
    timeoutMs: number, 
    operation: string = 'operation'
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new TimeoutError(`${operation} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        })
    ]);
}