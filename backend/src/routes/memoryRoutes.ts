/**
 * HTTP routes for memory management API
 */

import { Router, Request, Response } from 'express';
import { MemoryService } from '../memory/MemoryService';
import { AuthService } from '../auth/AuthService';
import { 
    createError, 
    ErrorHandler, 
    asyncHandler 
} from '../errors';
import {
    MemoryType,
    MemoryStatus,
    CreateMemoryRequest,
    UpdateMemoryRequest,
    MemoryQuery
} from '../types/memory';
import { createLogger } from '../logging/Logger';
import configService from '../config/ConfigService';

const logger = createLogger(configService);

// Middleware for authentication
const authenticateUser = async (req: Request, res: Response, next: any) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            throw createError.validation('Authentication token required');
        }

        const authService = new AuthService();
        const user = await authService.verifyToken(token);
        if (!user) {
            throw createError.validation('Invalid or expired token');
        }

        (req as any).user = user;
        next();
    } catch (error) {
        const appError = ErrorHandler.handle(error as Error);
        res.status(appError.statusCode).json({
            success: false,
            error: {
                code: appError.code,
                message: appError.message
            }
        });
    }
};

export function createMemoryRoutes(memoryService: MemoryService): Router {
    const router = Router();

    /**
     * POST /api/memory/register
     * Register a new user
     */
    router.post('/register', asyncHandler(async (req: Request, res: Response) => {
        const authService = new AuthService();
        const result = await authService.register(req.body);

        if (result.success) {
            res.status(201).json({
                success: true,
                data: {
                    user: result.user,
                    token: result.token,
                    expiresAt: result.expiresAt
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: {
                    code: 'REGISTRATION_FAILED',
                    message: 'Registration failed'
                }
            });
        }
    }));

    /**
     * POST /api/memory/login
     * User login
     */
    router.post('/login', asyncHandler(async (req: Request, res: Response) => {
        const authService = new AuthService();
        const result = await authService.login(req.body);

        if (result.success) {
            res.json({
                success: true,
                data: {
                    user: result.user,
                    token: result.token,
                    expiresAt: result.expiresAt
                }
            });
        } else {
            res.status(401).json({
                success: false,
                error: {
                    code: 'LOGIN_FAILED',
                    message: 'Invalid credentials'
                }
            });
        }
    }));

    /**
     * GET /api/memory/profile
     * Get current user profile
     */
    router.get('/profile', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
        const user = (req as any).user;
        
        res.json({
            success: true,
            data: {
                user: user
            }
        });
    }));

    /**
     * PUT /api/memory/profile
     * Update user preferences
     */
    router.put('/profile', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
        const user = (req as any).user;
        const authService = new AuthService();
        
        const success = await authService.updateUserPreferences(user.id, req.body.preferences);
        
        if (success) {
            res.json({
                success: true,
                message: 'Preferences updated successfully'
            });
        } else {
            throw createError.validation('Failed to update preferences');
        }
    }));

    /**
     * POST /api/memory/items
     * Create a new memory item
     */
    router.post('/items', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
        const user = (req as any).user;
        const createRequest: CreateMemoryRequest = req.body;

        const memoryItem = await memoryService.createMemory(user.id, createRequest);

        res.status(201).json({
            success: true,
            data: {
                memoryItem
            }
        });
    }));

    /**
     * GET /api/memory/items
     * Query memory items with filters
     */
    router.get('/items', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
        const user = (req as any).user;
        const query = req.query;

        const memoryQuery: MemoryQuery = {
            userId: user.id,
            content: query.content as string,
            type: query.type as MemoryType,
            status: query.status as MemoryStatus,
            sourceLang: query.sourceLang as string,
            targetLang: query.targetLang as string,
            tags: query.tags ? (query.tags as string).split(',') : undefined,
            limit: query.limit ? parseInt(query.limit as string) : 50,
            offset: query.offset ? parseInt(query.offset as string) : 0,
            sortBy: query.sortBy as any,
            sortOrder: query.sortOrder as 'asc' | 'desc'
        };

        if (query.fromDate && query.toDate) {
            memoryQuery.dateRange = {
                from: new Date(query.fromDate as string),
                to: new Date(query.toDate as string)
            };
        }

        const memories = await memoryService.queryMemories(memoryQuery);

        res.json({
            success: true,
            data: {
                memories,
                total: memories.length,
                query: memoryQuery
            }
        });
    }));

    /**
     * GET /api/memory/items/:id
     * Get a specific memory item
     */
    router.get('/items/:id', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
        const user = (req as any).user;
        const memoryId = req.params.id;

        const memories = await memoryService.queryMemories({
            userId: user.id,
            limit: 1
        });

        const memory = memories.find(m => m.id === memoryId);
        if (!memory) {
            res.status(404).json({
                success: false,
                error: {
                    code: 'MEMORY_NOT_FOUND',
                    message: 'Memory item not found'
                }
            });
            return;
        }

        res.json({
            success: true,
            data: {
                memoryItem: memory
            }
        });
    }));

    /**
     * PUT /api/memory/items/:id
     * Update a memory item
     */
    router.put('/items/:id', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
        const user = (req as any).user;
        const memoryId = req.params.id;
        const updateRequest: UpdateMemoryRequest = req.body;

        const updatedMemory = await memoryService.updateMemory(user.id, memoryId, updateRequest);

        if (updatedMemory) {
            res.json({
                success: true,
                data: {
                    memoryItem: updatedMemory
                }
            });
        } else {
            res.status(404).json({
                success: false,
                error: {
                    code: 'MEMORY_NOT_FOUND',
                    message: 'Memory item not found'
                }
            });
        }
    }));

    /**
     * DELETE /api/memory/items/:id
     * Delete a memory item
     */
    router.delete('/items/:id', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
        const user = (req as any).user;
        const memoryId = req.params.id;

        const success = await memoryService.deleteMemory(user.id, memoryId);

        if (success) {
            res.json({
                success: true,
                message: 'Memory item deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: {
                    code: 'MEMORY_NOT_FOUND',
                    message: 'Memory item not found'
                }
            });
        }
    }));

    /**
     * POST /api/memory/check
     * Check if content exists in memory
     */
    router.post('/check', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
        const user = (req as any).user;
        const { content, sourceLang, targetLang } = req.body;

        const result = await memoryService.checkMemory(user.id, {
            content,
            sourceLang,
            targetLang
        });

        res.json({
            success: true,
            data: result
        });
    }));

    /**
     * GET /api/memory/stats
     * Get user memory statistics
     */
    router.get('/stats', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
        const user = (req as any).user;

        const stats = await memoryService.getMemoryStats(user.id);

        res.json({
            success: true,
            data: stats
        });
    }));

    /**
     * GET /api/memory/review
     * Get items that need review
     */
    router.get('/review', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
        const user = (req as any).user;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

        const itemsForReview = await memoryService.getItemsForReview(user.id, limit);

        res.json({
            success: true,
            data: {
                items: itemsForReview,
                count: itemsForReview.length
            }
        });
    }));

    /**
     * POST /api/memory/review/:id
     * Record a review result
     */
    router.post('/review/:id', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
        const user = (req as any).user;
        const memoryId = req.params.id;
        const { isSuccessful, responseTime, userDifficulty } = req.body;

        await memoryService.recordReview(
            user.id,
            memoryId,
            isSuccessful,
            responseTime,
            userDifficulty
        );

        res.json({
            success: true,
            message: 'Review recorded successfully'
        });
    }));

    /**
     * POST /api/memory/permanent
     * Set multiple items as permanent
     */
    router.post('/permanent', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
        const user = (req as any).user;
        const { memoryIds } = req.body;

        if (!Array.isArray(memoryIds)) {
            throw createError.validation('memoryIds must be an array');
        }

        const updatedCount = await memoryService.setPermanentMemories(user.id, memoryIds);

        res.json({
            success: true,
            data: {
                requested: memoryIds.length,
                updated: updatedCount
            }
        });
    }));

    /**
     * GET /api/memory/export
     * Export user memories
     */
    router.get('/export', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
        const user = (req as any).user;
        const format = req.query.format as string || 'json';

        const memories = await memoryService.queryMemories({
            userId: user.id,
            limit: 10000 // Export all memories
        });

        if (format === 'csv') {
            // Convert to CSV format
            const csv = [
                'ID,Content,Translation,Source Lang,Target Lang,Type,Status,Created At,Access Count',
                ...memories.map(m => 
                    `"${m.id}","${m.content.replace(/"/g, '""')}","${m.translatedContent.replace(/"/g, '""')}","${m.sourceLang}","${m.targetLang}","${m.type}","${m.status}","${m.createdAt.toISOString()}","${m.accessCount}"`
                )
            ].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="memories_${user.username}_${Date.now()}.csv"`);
            res.send(csv);
        } else {
            // JSON format
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="memories_${user.username}_${Date.now()}.json"`);
            res.json({
                exportedAt: new Date().toISOString(),
                user: {
                    id: user.id,
                    username: user.username
                },
                memories
            });
        }
    }));

    /**
     * POST /api/memory/import
     * Import memories from file
     */
    router.post('/import', authenticateUser, asyncHandler(async (req: Request, res: Response) => {
        const user = (req as any).user;
        const { memories } = req.body;

        if (!Array.isArray(memories)) {
            throw createError.validation('memories must be an array');
        }

        let imported = 0;
        let errors = 0;

        for (const memoryData of memories) {
            try {
                await memoryService.createMemory(user.id, {
                    content: memoryData.content,
                    translatedContent: memoryData.translatedContent,
                    sourceLang: memoryData.sourceLang,
                    targetLang: memoryData.targetLang,
                    type: memoryData.type || MemoryType.SENTENCE,
                    status: memoryData.status || MemoryStatus.TEMPORARY,
                    tags: memoryData.tags || []
                });
                imported++;
            } catch (error) {
                logger.warn('Failed to import memory item', {
                    userId: user.id,
                    content: memoryData.content?.substring(0, 50),
                    error: (error as Error).message
                });
                errors++;
            }
        }

        res.json({
            success: true,
            data: {
                total: memories.length,
                imported,
                errors
            }
        });
    }));

    return router;
}