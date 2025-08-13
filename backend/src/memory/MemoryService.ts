/**
 * Memory service for managing user memories with Ebbinghaus forgetting curve
 */

import { randomUUID } from 'crypto';
import { createLogger } from '../logging/Logger';
import configService from '../config/ConfigService';
import { ForgettingCurveEngine } from './ForgettingCurveEngine';
import {
    MemoryItem,
    MemoryType,
    MemoryStatus,
    MemoryQuery,
    MemoryStats,
    CreateMemoryRequest,
    UpdateMemoryRequest,
    MemoryCheckRequest,
    MemoryCheckResponse,
    ReviewSession,
    ReviewItem,
    MemoryAnalytics,
    RetentionData
} from '../types/memory';
import {
    AppError,
    ErrorHandler,
    createError,
    Validator,
    asyncHandler
} from '../errors';

const logger = createLogger(configService);

export class MemoryService {
    private memories: Map<string, MemoryItem> = new Map(); // In-memory storage (replace with database)
    private userMemories: Map<string, Set<string>> = new Map(); // userId -> Set<memoryId>
    private forgettingCurveEngine: ForgettingCurveEngine;
    private reviewSessions: Map<string, ReviewSession> = new Map();

    constructor() {
        this.forgettingCurveEngine = new ForgettingCurveEngine();
        this.startPeriodicCleanup();
    }

    /**
     * 创建新的记忆项
     */
    public async createMemory(userId: string, request: CreateMemoryRequest): Promise<MemoryItem> {
        try {
            // 验证输入
            this.validateCreateMemoryRequest(request);

            // 检查是否已存在相同内容
            const existingMemory = await this.findSimilarMemory(
                userId,
                request.content,
                request.sourceLang,
                request.targetLang
            );

            if (existingMemory) {
                logger.info('Similar memory found, updating existing', {
                    userId,
                    existingId: existingMemory.id,
                    content: request.content
                });
                
                // 更新现有记忆的访问计数和时间
                existingMemory.lastAccessedAt = new Date();
                existingMemory.accessCount++;
                this.memories.set(existingMemory.id, existingMemory);
                
                return existingMemory;
            }

            // 创建新记忆项
            const memoryId = randomUUID();
            const now = new Date();

            // 创建保持数据
            const retentionData = this.forgettingCurveEngine.createInitialRetentionData(
                request.initialDifficulty || 3,
                1.0
            );

            const memoryItem: MemoryItem = {
                id: memoryId,
                userId,
                content: request.content,
                translatedContent: request.translatedContent,
                sourceLang: request.sourceLang,
                targetLang: request.targetLang,
                type: request.type,
                status: request.status || MemoryStatus.TEMPORARY,
                createdAt: now,
                lastAccessedAt: now,
                accessCount: 1,
                retentionData,
                tags: request.tags || [],
                context: request.context
            };

            // 存储记忆项
            this.memories.set(memoryId, memoryItem);
            
            // 更新用户记忆索引
            if (!this.userMemories.has(userId)) {
                this.userMemories.set(userId, new Set());
            }
            this.userMemories.get(userId)!.add(memoryId);

            logger.info('Memory created successfully', {
                userId,
                memoryId,
                type: request.type,
                status: memoryItem.status,
                content: request.content.substring(0, 50)
            });

            return memoryItem;

        } catch (error) {
            const appError = ErrorHandler.handle(error as Error);
            logger.error('Failed to create memory', {
                userId,
                error: appError.toJSON(),
                content: request.content.substring(0, 50)
            });
            throw appError;
        }
    }

    /**
     * 检查内容是否已在记忆中（用于决定是否触发翻译）
     */
    public async checkMemory(userId: string, request: MemoryCheckRequest): Promise<MemoryCheckResponse> {
        try {
            // 查找精确匹配
            const exactMatch = await this.findExactMemory(
                userId,
                request.content,
                request.sourceLang,
                request.targetLang
            );

            if (exactMatch) {
                // 更新访问信息
                exactMatch.lastAccessedAt = new Date();
                exactMatch.accessCount++;
                this.memories.set(exactMatch.id, exactMatch);

                // 判断是否应该触发翻译
                const shouldTranslate = this.shouldTriggerTranslation(exactMatch);

                logger.debug('Memory check - exact match found', {
                    userId,
                    memoryId: exactMatch.id,
                    status: exactMatch.status,
                    shouldTranslate
                });

                return {
                    exists: true,
                    memoryItem: exactMatch,
                    shouldTranslate,
                    cachedTranslation: shouldTranslate ? undefined : exactMatch.translatedContent
                };
            }

            // 查找相似内容
            const similarMemories = await this.findSimilarMemories(
                userId,
                request.content,
                request.sourceLang,
                request.targetLang,
                5 // 最多返回5个相似项
            );

            return {
                exists: false,
                shouldTranslate: true,
                suggestions: similarMemories
            };

        } catch (error) {
            logger.error('Memory check failed', {
                userId,
                error: (error as Error).message,
                content: request.content.substring(0, 50)
            });
            
            // 发生错误时默认允许翻译
            return {
                exists: false,
                shouldTranslate: true
            };
        }
    }

    /**
     * 更新记忆项
     */
    public async updateMemory(
        userId: string,
        memoryId: string,
        request: UpdateMemoryRequest
    ): Promise<MemoryItem | null> {
        try {
            const memory = this.memories.get(memoryId);
            if (!memory || memory.userId !== userId) {
                throw createError.validation('Memory not found');
            }

            // 更新字段
            if (request.status !== undefined) {
                memory.status = request.status;
                
                // 如果设置为永久记忆，更新保持数据
                if (request.status === MemoryStatus.PERMANENT) {
                    memory.retentionData.currentStrength = 1.0;
                    memory.retentionData.nextReviewAt = undefined; // 永久记忆不需要复习
                }
            }

            if (request.tags !== undefined) {
                memory.tags = request.tags;
            }

            if (request.customRetentionData) {
                memory.retentionData = {
                    ...memory.retentionData,
                    ...request.customRetentionData
                };
            }

            memory.lastAccessedAt = new Date();
            this.memories.set(memoryId, memory);

            logger.info('Memory updated successfully', {
                userId,
                memoryId,
                updates: Object.keys(request)
            });

            return memory;

        } catch (error) {
            const appError = ErrorHandler.handle(error as Error);
            logger.error('Failed to update memory', {
                userId,
                memoryId,
                error: appError.toJSON()
            });
            throw appError;
        }
    }

    /**
     * 删除记忆项
     */
    public async deleteMemory(userId: string, memoryId: string): Promise<boolean> {
        try {
            const memory = this.memories.get(memoryId);
            if (!memory || memory.userId !== userId) {
                return false;
            }

            // 从存储中删除
            this.memories.delete(memoryId);
            
            // 从用户索引中删除
            const userMemoriesSet = this.userMemories.get(userId);
            if (userMemoriesSet) {
                userMemoriesSet.delete(memoryId);
            }

            logger.info('Memory deleted successfully', {
                userId,
                memoryId
            });

            return true;

        } catch (error) {
            logger.error('Failed to delete memory', {
                userId,
                memoryId,
                error: (error as Error).message
            });
            return false;
        }
    }

    /**
     * 查询用户记忆
     */
    public async queryMemories(query: MemoryQuery): Promise<MemoryItem[]> {
        try {
            const userMemoriesSet = this.userMemories.get(query.userId);
            if (!userMemoriesSet) {
                return [];
            }

            let memories = Array.from(userMemoriesSet)
                .map(id => this.memories.get(id))
                .filter((memory): memory is MemoryItem => memory !== undefined);

            // 应用过滤条件
            if (query.content) {
                const searchTerm = query.content.toLowerCase();
                memories = memories.filter(m => 
                    m.content.toLowerCase().includes(searchTerm) ||
                    m.translatedContent.toLowerCase().includes(searchTerm)
                );
            }

            if (query.type) {
                memories = memories.filter(m => m.type === query.type);
            }

            if (query.status) {
                memories = memories.filter(m => m.status === query.status);
            }

            if (query.sourceLang) {
                memories = memories.filter(m => m.sourceLang === query.sourceLang);
            }

            if (query.targetLang) {
                memories = memories.filter(m => m.targetLang === query.targetLang);
            }

            if (query.tags && query.tags.length > 0) {
                memories = memories.filter(m => 
                    query.tags!.some(tag => m.tags.includes(tag))
                );
            }

            if (query.dateRange) {
                memories = memories.filter(m => 
                    m.createdAt >= query.dateRange!.from &&
                    m.createdAt <= query.dateRange!.to
                );
            }

            // 排序
            if (query.sortBy) {
                memories.sort((a, b) => {
                    let aValue: any, bValue: any;
                    
                    switch (query.sortBy) {
                        case 'createdAt':
                            aValue = a.createdAt.getTime();
                            bValue = b.createdAt.getTime();
                            break;
                        case 'lastAccessedAt':
                            aValue = a.lastAccessedAt.getTime();
                            bValue = b.lastAccessedAt.getTime();
                            break;
                        case 'accessCount':
                            aValue = a.accessCount;
                            bValue = b.accessCount;
                            break;
                        case 'retentionStrength':
                            aValue = a.retentionData.currentStrength;
                            bValue = b.retentionData.currentStrength;
                            break;
                        default:
                            return 0;
                    }

                    const result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                    return query.sortOrder === 'desc' ? -result : result;
                });
            }

            // 分页
            const offset = query.offset || 0;
            const limit = query.limit || 50;
            
            return memories.slice(offset, offset + limit);

        } catch (error) {
            logger.error('Memory query failed', {
                userId: query.userId,
                error: (error as Error).message
            });
            return [];
        }
    }

    /**
     * 获取用户记忆统计
     */
    public async getMemoryStats(userId: string): Promise<MemoryStats> {
        try {
            const userMemoriesSet = this.userMemories.get(userId);
            if (!userMemoriesSet) {
                return this.createEmptyStats(userId);
            }

            const memories = Array.from(userMemoriesSet)
                .map(id => this.memories.get(id))
                .filter((memory): memory is MemoryItem => memory !== undefined);

            const stats = this.forgettingCurveEngine.getMemoryStatistics(memories);
            
            // 获取最常访问的记忆
            const mostAccessedItems = memories
                .sort((a, b) => b.accessCount - a.accessCount)
                .slice(0, 10);

            // 获取最近的记忆
            const recentItems = memories
                .sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime())
                .slice(0, 10);

            // 获取即将复习的记忆
            const upcomingReviews = memories
                .filter(m => m.retentionData.nextReviewAt)
                .sort((a, b) => 
                    a.retentionData.nextReviewAt!.getTime() - 
                    b.retentionData.nextReviewAt!.getTime()
                )
                .slice(0, 10);

            // 按状态统计
            const statusCounts = memories.reduce((acc, memory) => {
                acc[memory.status] = (acc[memory.status] || 0) + 1;
                return acc;
            }, {} as Record<MemoryStatus, number>);

            return {
                userId,
                totalItems: stats.totalItems,
                permanentItems: statusCounts[MemoryStatus.PERMANENT] || 0,
                temporaryItems: statusCounts[MemoryStatus.TEMPORARY] || 0,
                learningItems: statusCounts[MemoryStatus.LEARNING] || 0,
                forgottenItems: statusCounts[MemoryStatus.FORGOTTEN] || 0,
                averageRetention: stats.averageRetention,
                mostAccessedItems,
                recentItems,
                upcomingReviews
            };

        } catch (error) {
            logger.error('Failed to get memory stats', {
                userId,
                error: (error as Error).message
            });
            return this.createEmptyStats(userId);
        }
    }

    /**
     * 获取需要复习的记忆项
     */
    public async getItemsForReview(userId: string, limit: number = 20): Promise<MemoryItem[]> {
        const userMemoriesSet = this.userMemories.get(userId);
        if (!userMemoriesSet) {
            return [];
        }

        const memories = Array.from(userMemoriesSet)
            .map(id => this.memories.get(id))
            .filter((memory): memory is MemoryItem => memory !== undefined)
            .filter(memory => memory.status !== MemoryStatus.PERMANENT); // 永久记忆不需要复习

        const memoryData = memories.map(m => ({
            id: m.id,
            retentionData: m.retentionData
        }));

        const itemsForReview = this.forgettingCurveEngine.getItemsForReview(memoryData);
        
        return memories
            .filter(m => itemsForReview.includes(m.id))
            .slice(0, limit);
    }

    /**
     * 记录复习结果
     */
    public async recordReview(
        userId: string,
        memoryId: string,
        isSuccessful: boolean,
        responseTime?: number,
        userDifficulty?: number
    ): Promise<void> {
        try {
            const memory = this.memories.get(memoryId);
            if (!memory || memory.userId !== userId) {
                throw createError.validation('Memory not found');
            }

            // 更新保持数据
            const updatedRetentionData = this.forgettingCurveEngine.updateRetentionAfterReview(
                memory.retentionData,
                isSuccessful,
                responseTime,
                userDifficulty
            );

            memory.retentionData = updatedRetentionData;
            memory.lastAccessedAt = new Date();
            memory.accessCount++;

            // 根据复习结果更新状态
            if (isSuccessful && memory.retentionData.currentStrength > 0.8) {
                memory.status = MemoryStatus.LEARNING;
            } else if (!isSuccessful && memory.retentionData.currentStrength < 0.3) {
                memory.status = MemoryStatus.FORGOTTEN;
            }

            this.memories.set(memoryId, memory);

            logger.info('Review recorded', {
                userId,
                memoryId,
                isSuccessful,
                newStrength: memory.retentionData.currentStrength,
                nextReview: memory.retentionData.nextReviewAt
            });

        } catch (error) {
            const appError = ErrorHandler.handle(error as Error);
            logger.error('Failed to record review', {
                userId,
                memoryId,
                error: appError.toJSON()
            });
            throw appError;
        }
    }

    /**
     * 批量设置为永久记忆
     */
    public async setPermanentMemories(userId: string, memoryIds: string[]): Promise<number> {
        let updatedCount = 0;

        for (const memoryId of memoryIds) {
            try {
                const memory = this.memories.get(memoryId);
                if (memory && memory.userId === userId) {
                    memory.status = MemoryStatus.PERMANENT;
                    memory.retentionData.currentStrength = 1.0;
                    memory.retentionData.nextReviewAt = undefined;
                    this.memories.set(memoryId, memory);
                    updatedCount++;
                }
            } catch (error) {
                logger.warn('Failed to set permanent memory', {
                    userId,
                    memoryId,
                    error: (error as Error).message
                });
            }
        }

        logger.info('Batch set permanent memories', {
            userId,
            requested: memoryIds.length,
            updated: updatedCount
        });

        return updatedCount;
    }

    /**
     * 清理过期的临时记忆
     */
    public async cleanupExpiredMemories(): Promise<void> {
        let cleanedCount = 0;
        const now = Date.now();
        const expiryThreshold = 30 * 24 * 60 * 60 * 1000; // 30天

        for (const [memoryId, memory] of this.memories.entries()) {
            if (memory.status === MemoryStatus.TEMPORARY) {
                const memoryState = this.forgettingCurveEngine.calculateMemoryState(memory.retentionData);
                const age = now - memory.createdAt.getTime();
                
                // 如果记忆强度很低且超过30天，删除
                if (!memoryState.isRemembered && age > expiryThreshold) {
                    this.memories.delete(memoryId);
                    
                    // 从用户索引中删除
                    const userMemoriesSet = this.userMemories.get(memory.userId);
                    if (userMemoriesSet) {
                        userMemoriesSet.delete(memoryId);
                    }
                    
                    cleanedCount++;
                }
            }
        }

        if (cleanedCount > 0) {
            logger.info('Cleaned up expired memories', { cleanedCount });
        }
    }

    // 私有方法

    private validateCreateMemoryRequest(request: CreateMemoryRequest): void {
        if (!request.content || request.content.trim().length === 0) {
            throw createError.validation('Content is required');
        }

        if (!request.translatedContent || request.translatedContent.trim().length === 0) {
            throw createError.validation('Translated content is required');
        }

        if (!request.sourceLang || !Validator.isValidLanguageCode(request.sourceLang)) {
            throw createError.validation('Valid source language is required');
        }

        if (!request.targetLang || !Validator.isValidLanguageCode(request.targetLang)) {
            throw createError.validation('Valid target language is required');
        }

        if (!Object.values(MemoryType).includes(request.type)) {
            throw createError.validation('Valid memory type is required');
        }
    }

    private async findExactMemory(
        userId: string,
        content: string,
        sourceLang: string,
        targetLang: string
    ): Promise<MemoryItem | null> {
        const userMemoriesSet = this.userMemories.get(userId);
        if (!userMemoriesSet) {
            return null;
        }

        for (const memoryId of userMemoriesSet) {
            const memory = this.memories.get(memoryId);
            if (memory &&
                memory.content === content &&
                memory.sourceLang === sourceLang &&
                memory.targetLang === targetLang) {
                return memory;
            }
        }

        return null;
    }

    private async findSimilarMemory(
        userId: string,
        content: string,
        sourceLang: string,
        targetLang: string
    ): Promise<MemoryItem | null> {
        const userMemoriesSet = this.userMemories.get(userId);
        if (!userMemoriesSet) {
            return null;
        }

        const contentLower = content.toLowerCase();
        
        for (const memoryId of userMemoriesSet) {
            const memory = this.memories.get(memoryId);
            if (memory &&
                memory.sourceLang === sourceLang &&
                memory.targetLang === targetLang &&
                memory.content.toLowerCase() === contentLower) {
                return memory;
            }
        }

        return null;
    }

    private async findSimilarMemories(
        userId: string,
        content: string,
        sourceLang: string,
        targetLang: string,
        limit: number
    ): Promise<MemoryItem[]> {
        const userMemoriesSet = this.userMemories.get(userId);
        if (!userMemoriesSet) {
            return [];
        }

        const contentLower = content.toLowerCase();
        const similarMemories: MemoryItem[] = [];

        for (const memoryId of userMemoriesSet) {
            const memory = this.memories.get(memoryId);
            if (memory &&
                memory.sourceLang === sourceLang &&
                memory.targetLang === targetLang) {
                
                // 简单的相似度计算（可以用更复杂的算法）
                const similarity = this.calculateSimilarity(contentLower, memory.content.toLowerCase());
                if (similarity > 0.7) { // 70%相似度阈值
                    similarMemories.push(memory);
                    if (similarMemories.length >= limit) {
                        break;
                    }
                }
            }
        }

        return similarMemories;
    }

    private calculateSimilarity(str1: string, str2: string): number {
        // 简单的Jaccard相似度计算
        const set1 = new Set(str1.split(' '));
        const set2 = new Set(str2.split(' '));
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }

    private shouldTriggerTranslation(memory: MemoryItem): boolean {
        // 永久记忆和排除的记忆不触发翻译
        if (memory.status === MemoryStatus.PERMANENT || memory.status === MemoryStatus.EXCLUDED) {
            return false;
        }

        // 计算当前记忆状态
        const memoryState = this.forgettingCurveEngine.calculateMemoryState(memory.retentionData);
        
        // 如果记忆强度低，触发翻译（帮助强化记忆）
        return !memoryState.isRemembered;
    }

    private createEmptyStats(userId: string): MemoryStats {
        return {
            userId,
            totalItems: 0,
            permanentItems: 0,
            temporaryItems: 0,
            learningItems: 0,
            forgottenItems: 0,
            averageRetention: 0,
            mostAccessedItems: [],
            recentItems: [],
            upcomingReviews: []
        };
    }

    private startPeriodicCleanup(): void {
        // 每天清理一次过期记忆
        setInterval(() => {
            this.cleanupExpiredMemories().catch(error => {
                logger.error('Periodic cleanup failed', { error: error.message });
            });
        }, 24 * 60 * 60 * 1000); // 24小时
    }
}