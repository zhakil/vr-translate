/**
 * Ebbinghaus Forgetting Curve Engine
 * Implements the forgetting curve algorithm for memory retention calculation
 */

import { 
    RetentionData, 
    RetentionFactors, 
    ForgettingCurveData, 
    DEFAULT_RETENTION_FACTORS,
    EBBINGHAUS_INTERVALS 
} from '../types/memory';
import { createLogger } from '../logging/Logger';
import configService from '../config/ConfigService';

const logger = createLogger(configService);

export class ForgettingCurveEngine {
    private retentionFactors: RetentionFactors;

    constructor(customFactors?: Partial<RetentionFactors>) {
        this.retentionFactors = {
            ...DEFAULT_RETENTION_FACTORS,
            ...customFactors
        };
    }

    /**
     * 计算基于艾宾浩斯遗忘曲线的记忆保持率
     * @param timeElapsed 经过的时间（毫秒）
     * @param initialStrength 初始记忆强度 (0-1)
     * @param reviewCount 复习次数
     * @param difficultyLevel 难度等级 (1-5)
     * @returns 当前记忆保持率 (0-1)
     */
    public calculateRetention(
        timeElapsed: number,
        initialStrength: number = 1.0,
        reviewCount: number = 0,
        difficultyLevel: number = 3
    ): number {
        // 艾宾浩斯遗忘曲线公式: R(t) = e^(-t/S)
        // 其中 R(t) 是时间t后的保持率，S是记忆强度因子

        // 计算时间因子（小时）
        const hoursElapsed = timeElapsed / (1000 * 60 * 60);

        // 基础遗忘率（根据难度调整）
        const baseForgettingRate = this.calculateBaseForgettingRate(difficultyLevel);

        // 复习效果（每次复习增强记忆）
        const reviewBonus = this.calculateReviewBonus(reviewCount);

        // 记忆强度因子
        const memoryStrength = initialStrength * reviewBonus;

        // 调整后的遗忘率
        const adjustedForgettingRate = baseForgettingRate / memoryStrength;

        // 计算保持率
        const retention = Math.exp(-hoursElapsed / adjustedForgettingRate);

        // 确保在 0-1 范围内
        return Math.max(0, Math.min(1, retention));
    }

    /**
     * 根据当前时间和上次复习时间计算记忆状态
     */
    public calculateMemoryState(retentionData: RetentionData): ForgettingCurveData {
        const now = Date.now();
        const lastReview = retentionData.lastReviewAt?.getTime() || now;
        const timeElapsed = now - lastReview;

        const retentionProbability = this.calculateRetention(
            timeElapsed,
            retentionData.currentStrength,
            retentionData.reviewCount,
            retentionData.difficultyLevel
        );

        // 判断是否仍然记得（阈值可配置）
        const rememberThreshold = 0.3; // 30%以下认为已遗忘
        const isRemembered = retentionProbability > rememberThreshold;

        // 计算下次复习时间
        const nextReviewTime = this.calculateNextReviewTime(retentionData);

        return {
            timeElapsed,
            retentionProbability,
            isRemembered,
            nextReviewTime
        };
    }

    /**
     * 计算下次复习的最佳时间
     */
    public calculateNextReviewTime(retentionData: RetentionData): number {
        const { reviewCount, successfulReviews, difficultyLevel } = retentionData;

        // 使用间隔重复算法（基于艾宾浩斯曲线优化）
        let intervalIndex = Math.min(reviewCount, EBBINGHAUS_INTERVALS.length - 1);
        
        // 根据成功率调整间隔
        const successRate = reviewCount > 0 ? successfulReviews / reviewCount : 0;
        if (successRate < 0.6) {
            // 成功率低，缩短间隔
            intervalIndex = Math.max(0, intervalIndex - 1);
        } else if (successRate > 0.9) {
            // 成功率高，延长间隔
            intervalIndex = Math.min(EBBINGHAUS_INTERVALS.length - 1, intervalIndex + 1);
        }

        // 根据难度调整
        const difficultyMultiplier = this.getDifficultyMultiplier(difficultyLevel);
        
        const baseInterval = EBBINGHAUS_INTERVALS[intervalIndex].multiplier;
        const adjustedInterval = baseInterval * difficultyMultiplier;

        // 转换为毫秒
        return adjustedInterval * 60 * 60 * 1000;
    }

    /**
     * 更新记忆数据（复习后）
     */
    public updateRetentionAfterReview(
        retentionData: RetentionData,
        isSuccessful: boolean,
        responseTime?: number,
        userDifficulty?: number
    ): RetentionData {
        const now = new Date();
        const newReviewCount = retentionData.reviewCount + 1;
        const newSuccessfulReviews = retentionData.successfulReviews + (isSuccessful ? 1 : 0);

        // 根据复习结果更新记忆强度
        let newStrength = retentionData.currentStrength;
        if (isSuccessful) {
            // 成功复习，增强记忆
            newStrength = Math.min(1.0, newStrength * 1.3);
        } else {
            // 失败复习，减弱记忆
            newStrength = Math.max(0.1, newStrength * 0.8);
        }

        // 根据响应时间调整难度
        let newDifficulty = retentionData.difficultyLevel;
        if (userDifficulty) {
            newDifficulty = userDifficulty;
        } else if (responseTime) {
            // 自动调整难度：响应时间越长，难度越高
            if (responseTime > 10000) { // 10秒以上
                newDifficulty = Math.min(5, newDifficulty + 0.5);
            } else if (responseTime < 3000) { // 3秒以内
                newDifficulty = Math.max(1, newDifficulty - 0.5);
            }
        }

        // 计算下次复习时间
        const nextReviewInterval = this.calculateNextReviewTime({
            ...retentionData,
            reviewCount: newReviewCount,
            successfulReviews: newSuccessfulReviews,
            difficultyLevel: newDifficulty
        });

        return {
            ...retentionData,
            currentStrength: newStrength,
            lastReviewAt: now,
            nextReviewAt: new Date(now.getTime() + nextReviewInterval),
            reviewCount: newReviewCount,
            successfulReviews: newSuccessfulReviews,
            difficultyLevel: newDifficulty
        };
    }

    /**
     * 创建新记忆项的初始保持数据
     */
    public createInitialRetentionData(
        initialDifficulty: number = 3,
        initialStrength: number = 1.0
    ): RetentionData {
        const now = new Date();
        const firstReviewInterval = this.calculateNextReviewTime({
            initialStrength,
            currentStrength: initialStrength,
            forgettingRate: this.calculateBaseForgettingRate(initialDifficulty),
            reviewCount: 0,
            successfulReviews: 0,
            difficultyLevel: initialDifficulty
        });

        return {
            initialStrength,
            currentStrength: initialStrength,
            forgettingRate: this.calculateBaseForgettingRate(initialDifficulty),
            nextReviewAt: new Date(now.getTime() + firstReviewInterval),
            reviewCount: 0,
            successfulReviews: 0,
            difficultyLevel: initialDifficulty
        };
    }

    /**
     * 批量计算需要复习的记忆项
     */
    public getItemsForReview(memoryItems: { id: string; retentionData: RetentionData }[]): string[] {
        const now = Date.now();
        const itemsForReview: string[] = [];

        for (const item of memoryItems) {
            const memoryState = this.calculateMemoryState(item.retentionData);
            
            // 如果记忆强度低于阈值或到了复习时间
            if (!memoryState.isRemembered || 
                (item.retentionData.nextReviewAt && item.retentionData.nextReviewAt.getTime() <= now)) {
                itemsForReview.push(item.id);
            }
        }

        return itemsForReview;
    }

    /**
     * 获取记忆统计信息
     */
    public getMemoryStatistics(memoryItems: { retentionData: RetentionData }[]) {
        const now = Date.now();
        let totalStrength = 0;
        let rememberedCount = 0;
        let needsReviewCount = 0;
        let averageDifficulty = 0;

        for (const item of memoryItems) {
            const memoryState = this.calculateMemoryState(item.retentionData);
            totalStrength += memoryState.retentionProbability;
            averageDifficulty += item.retentionData.difficultyLevel;
            
            if (memoryState.isRemembered) {
                rememberedCount++;
            }
            
            if (item.retentionData.nextReviewAt && 
                item.retentionData.nextReviewAt.getTime() <= now) {
                needsReviewCount++;
            }
        }

        const totalItems = memoryItems.length;
        return {
            totalItems,
            averageRetention: totalItems > 0 ? totalStrength / totalItems : 0,
            rememberedItems: rememberedCount,
            forgottenItems: totalItems - rememberedCount,
            itemsNeedingReview: needsReviewCount,
            averageDifficulty: totalItems > 0 ? averageDifficulty / totalItems : 0
        };
    }

    /**
     * 计算基础遗忘率（根据难度）
     */
    private calculateBaseForgettingRate(difficultyLevel: number): number {
        // 难度越高，遗忘越快
        const baseFactor = 24; // 24小时基准
        const difficultyFactor = Math.pow(0.8, difficultyLevel - 3); // 难度3为基准
        return baseFactor * difficultyFactor;
    }

    /**
     * 计算复习奖励因子
     */
    private calculateReviewBonus(reviewCount: number): number {
        // 每次复习增强记忆，但效果递减
        return 1 + (reviewCount * 0.2) / (1 + reviewCount * 0.1);
    }

    /**
     * 获取难度乘数
     */
    private getDifficultyMultiplier(difficultyLevel: number): number {
        const multipliers = [2.0, 1.5, 1.0, 0.7, 0.5]; // 对应难度1-5
        const index = Math.max(0, Math.min(4, Math.floor(difficultyLevel) - 1));
        return multipliers[index];
    }

    /**
     * 自定义保持因子
     */
    public updateRetentionFactors(newFactors: Partial<RetentionFactors>): void {
        this.retentionFactors = {
            ...this.retentionFactors,
            ...newFactors
        };
        
        logger.info('Retention factors updated', { newFactors: this.retentionFactors });
    }

    /**
     * 预测未来记忆保持情况
     */
    public predictRetention(
        retentionData: RetentionData,
        futureDays: number[]
    ): { day: number; retention: number }[] {
        const predictions: { day: number; retention: number }[] = [];
        const baseTime = Date.now();

        for (const day of futureDays) {
            const futureTime = baseTime + (day * 24 * 60 * 60 * 1000);
            const timeElapsed = futureTime - (retentionData.lastReviewAt?.getTime() || baseTime);
            
            const retention = this.calculateRetention(
                timeElapsed,
                retentionData.currentStrength,
                retentionData.reviewCount,
                retentionData.difficultyLevel
            );

            predictions.push({ day, retention });
        }

        return predictions;
    }
}