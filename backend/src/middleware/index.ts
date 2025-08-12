import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * 请求验证中间件
 */
export const validateRequest = (requiredFields: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const missing = requiredFields.filter(field => !req.body[field]);
        
        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_FIELDS',
                message: `缺少必需字段: ${missing.join(', ')}`,
                required: requiredFields
            });
        }
        
        next();
    };
};

/**
 * 速率限制中间件
 */
export const rateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 1000, // 限制每个IP每小时1000次请求
    message: {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: '请求过于频繁，请稍后再试'
    },
    standardHeaders: true, // 返回标准的 `RateLimit` headers
    legacyHeaders: false, // 禁用 `X-RateLimit-*` headers
    skip: (req) => {
        // 开发环境跳过限制
        return process.env.NODE_ENV === 'development';
    }
});

/**
 * 错误处理中间件
 */
export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
    console.error('API错误:', error);

    // 如果已经发送了响应，直接返回
    if (res.headersSent) {
        return next(error);
    }

    // 根据错误类型返回不同的响应
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: error.message
        });
    }

    if (error.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            error: 'UNAUTHORIZED',
            message: '未授权的访问'
        });
    }

    // 默认服务器错误
    res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '服务器内部错误'
    });
};

/**
 * CORS中间件
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    next();
};

/**
 * 请求日志中间件
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
};