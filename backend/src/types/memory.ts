/**
 * Memory system types for VR Translation with Ebbinghaus forgetting curve
 */

// User and authentication types
export interface User {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    lastLoginAt?: Date;
    isActive: boolean;
    preferences: UserPreferences;
}

export interface UserPreferences {
    defaultSourceLanguage: string;
    defaultTargetLanguage: string;
    memorySettings: MemorySettings;
    vr: VRSettings;
}

export interface MemorySettings {
    enableForgettingCurve: boolean;
    customRetentionFactors: RetentionFactors;
    maxCacheSize: number;
    autoCleanupEnabled: boolean;
    reviewNotifications: boolean;
}

export interface VRSettings {
    deviceType: 'quest3' | 'quest2' | 'other';
    gazeSettings: {
        stabilityThreshold: number;
        timeThreshold: number;
        headGazeMode: boolean;
    };
}

export interface RetentionFactors {
    immediate: number;     // 即时记忆强度 (default: 1.0)
    hour: number;          // 1小时后 (default: 0.6)
    day: number;           // 1天后 (default: 0.4)
    week: number;          // 1周后 (default: 0.2)
    month: number;         // 1月后 (default: 0.1)
}

// Memory content types
export interface MemoryItem {
    id: string;
    userId: string;
    content: string;
    translatedContent: string;
    sourceLang: string;
    targetLang: string;
    type: MemoryType;
    status: MemoryStatus;
    createdAt: Date;
    lastAccessedAt: Date;
    accessCount: number;
    retentionData: RetentionData;
    tags: string[];
    context?: MemoryContext;
}

export enum MemoryType {
    WORD = 'word',           // 单词
    PHRASE = 'phrase',       // 词组
    SENTENCE = 'sentence',   // 句子
    PARAGRAPH = 'paragraph', // 段落
    CUSTOM = 'custom'        // 自定义内容
}

export enum MemoryStatus {
    TEMPORARY = 'temporary',     // 临时缓存（遵循遗忘曲线）
    PERMANENT = 'permanent',     // 永久记忆
    LEARNING = 'learning',       // 学习中（复习阶段）
    FORGOTTEN = 'forgotten',     // 已遗忘（需要重新学习）
    EXCLUDED = 'excluded'        // 排除翻译
}

export interface RetentionData {
    initialStrength: number;       // 初始记忆强度 (0-1)
    currentStrength: number;       // 当前记忆强度 (0-1)
    forgettingRate: number;        // 遗忘速率
    lastReviewAt?: Date;           // 最后复习时间
    nextReviewAt?: Date;           // 下次复习时间
    reviewCount: number;           // 复习次数
    successfulReviews: number;     // 成功复习次数
    difficultyLevel: number;       // 难度等级 (1-5)
}

export interface MemoryContext {
    sessionId?: string;            // VR会话ID
    gazePosition?: {               // 凝视位置
        x: number;
        y: number;
    };
    timestamp: Date;               // 记录时间
    deviceInfo?: {                 // 设备信息
        type: string;
        model?: string;
    };
    translationTrigger: 'gaze' | 'manual' | 'voice' | 'gesture';
}

// Memory management types
export interface MemoryQuery {
    userId: string;
    content?: string;              // 模糊匹配内容
    type?: MemoryType;
    status?: MemoryStatus;
    sourceLang?: string;
    targetLang?: string;
    tags?: string[];
    dateRange?: {
        from: Date;
        to: Date;
    };
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'lastAccessedAt' | 'accessCount' | 'retentionStrength';
    sortOrder?: 'asc' | 'desc';
}

export interface MemoryStats {
    userId: string;
    totalItems: number;
    permanentItems: number;
    temporaryItems: number;
    learningItems: number;
    forgottenItems: number;
    averageRetention: number;
    mostAccessedItems: MemoryItem[];
    recentItems: MemoryItem[];
    upcomingReviews: MemoryItem[];
}

export interface ForgettingCurveData {
    timeElapsed: number;           // 经过的时间（毫秒）
    retentionProbability: number;  // 记忆保持概率 (0-1)
    isRemembered: boolean;         // 是否仍然记得
    nextReviewTime: number;        // 下次复习时间（毫秒）
}

// Review system types
export interface ReviewSession {
    id: string;
    userId: string;
    startedAt: Date;
    completedAt?: Date;
    items: ReviewItem[];
    successRate: number;
    totalTimeSpent: number;        // 总花费时间（毫秒）
}

export interface ReviewItem {
    memoryItemId: string;
    presented: boolean;            // 是否已展示
    userResponse?: string;         // 用户回答
    isCorrect?: boolean;          // 是否正确
    responseTime?: number;         // 反应时间（毫秒）
    difficulty?: number;           // 用户反馈的难度
}

// API types
export interface CreateMemoryRequest {
    content: string;
    translatedContent: string;
    sourceLang: string;
    targetLang: string;
    type: MemoryType;
    status?: MemoryStatus;
    tags?: string[];
    context?: MemoryContext;
    initialDifficulty?: number;
}

export interface UpdateMemoryRequest {
    status?: MemoryStatus;
    tags?: string[];
    customRetentionData?: Partial<RetentionData>;
    notes?: string;
}

export interface MemoryCheckRequest {
    content: string;
    sourceLang: string;
    targetLang: string;
}

export interface MemoryCheckResponse {
    exists: boolean;
    memoryItem?: MemoryItem;
    shouldTranslate: boolean;      // 是否应该触发翻译
    cachedTranslation?: string;    // 缓存的翻译
    suggestions?: MemoryItem[];    // 相似的记忆项
}

// Authentication types
export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    preferences?: Partial<UserPreferences>;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface AuthResponse {
    success: boolean;
    user?: User;
    token?: string;
    expiresAt?: Date;
}

export interface JWTPayload {
    userId: string;
    username: string;
    iat: number;
    exp: number;
}

// Memory analytics types
export interface MemoryAnalytics {
    userId: string;
    timeframe: 'day' | 'week' | 'month' | 'year';
    data: {
        learningProgress: LearningProgress[];
        retentionRates: RetentionRate[];
        mostForgotten: MemoryItem[];
        studyStreak: number;
        totalStudyTime: number;
    };
}

export interface LearningProgress {
    date: Date;
    newItems: number;
    reviewedItems: number;
    masteredItems: number;
    forgottenItems: number;
}

export interface RetentionRate {
    timePoint: string;             // '1h', '1d', '1w', '1m'
    rate: number;                  // 保持率 (0-1)
}

// Export utility types
export type MemoryItemWithoutUser = Omit<MemoryItem, 'userId'>;
export type CreateMemoryData = Omit<MemoryItem, 'id' | 'createdAt' | 'lastAccessedAt' | 'accessCount'>;
export type UpdateMemoryData = Partial<Pick<MemoryItem, 'status' | 'tags' | 'retentionData'>>;

// Validation schemas (for runtime validation)
export const MemoryTypeValues = Object.values(MemoryType);
export const MemoryStatusValues = Object.values(MemoryStatus);

// Constants
export const DEFAULT_RETENTION_FACTORS: RetentionFactors = {
    immediate: 1.0,
    hour: 0.6,
    day: 0.4,
    week: 0.2,
    month: 0.1
};

export const DEFAULT_MEMORY_SETTINGS: MemorySettings = {
    enableForgettingCurve: true,
    customRetentionFactors: DEFAULT_RETENTION_FACTORS,
    maxCacheSize: 1000,
    autoCleanupEnabled: true,
    reviewNotifications: true
};

export const EBBINGHAUS_INTERVALS = [
    { period: '20m', multiplier: 1 },
    { period: '1h', multiplier: 3 },
    { period: '9h', multiplier: 9 },
    { period: '1d', multiplier: 24 },
    { period: '2d', multiplier: 48 },
    { period: '4d', multiplier: 96 },
    { period: '1w', multiplier: 168 },
    { period: '2w', multiplier: 336 },
    { period: '1m', multiplier: 720 },
    { period: '3m', multiplier: 2160 }
];