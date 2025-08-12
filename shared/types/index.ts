/**
 * 共享类型定义
 * 定义前端和后端通用的数据结构和类型
 */

// ================================
// 基础数据类型
// ================================

/**
 * 3D向量
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * 2D坐标点
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * 矩形区域
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 边界框
 */
export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

// ================================
// 眼动追踪相关类型
// ================================

/**
 * 眼动追踪数据
 */
export interface EyeTrackingData {
  /** 时间戳 */
  timestamp: number;
  /** 注视原点 */
  gazeOrigin: Vector3;
  /** 注视方向 */
  gazeDirection: Vector3;
  /** 置信度 (0-1) */
  confidence: number;
  /** 数据是否有效 */
  isValid: boolean;
  /** 是否有碰撞 */
  hasHit: boolean;
  /** 碰撞点 */
  hitPoint?: Vector3;
  /** 碰撞距离 */
  hitDistance?: number;
  /** 碰撞对象ID */
  hitObjectId?: string;
}

/**
 * 注视信息
 */
export interface GazeInfo {
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 持续时间 */
  duration?: number;
  /** 注视位置 */
  gazePosition: Vector3;
  /** 注视方向 */
  gazeDirection: Vector3;
  /** 注视对象ID */
  gazeObjectId?: string;
  /** 文本边界 */
  textBounds?: Rectangle;
  /** 是否已触发 */
  isTriggered: boolean;
}

/**
 * 眼动追踪设置
 */
export interface EyeTrackingSettings {
  /** 更新频率 (Hz) */
  updateRate: number;
  /** 置信度阈值 */
  confidenceThreshold: number;
  /** 注视射线长度 */
  gazeRayLength: number;
  /** 注视层掩码 */
  gazeLayerMask: number;
}

/**
 * 注视检测设置
 */
export interface GazeDetectionSettings {
  /** 注视阈值时间 (秒) */
  gazeThreshold: number;
  /** 注视区域半径 */
  gazeRadius: number;
  /** 显示注视指示器 */
  showGazeIndicator: boolean;
  /** 文本层掩码 */
  textLayerMask: number;
  /** 视觉反馈颜色 */
  normalColor: string;
  gazingColor: string;
  triggeredColor: string;
}

// ================================
// OCR相关类型
// ================================

/**
 * OCR识别结果
 */
export interface OCRResult {
  /** 识别的文本 */
  text: string;
  /** 置信度 (0-1) */
  confidence: number;
  /** 文本边界框 */
  boundingBox: Rectangle;
  /** 语言代码 */
  language?: string;
  /** 文本行信息 */
  lines?: OCRTextLine[];
  /** 处理时间 (毫秒) */
  processingTime: number;
}

/**
 * OCR文本行
 */
export interface OCRTextLine {
  /** 行文本 */
  text: string;
  /** 置信度 */
  confidence: number;
  /** 边界框 */
  boundingBox: Rectangle;
  /** 单词信息 */
  words?: OCRWord[];
}

/**
 * OCR单词
 */
export interface OCRWord {
  /** 单词文本 */
  text: string;
  /** 置信度 */
  confidence: number;
  /** 边界框 */
  boundingBox: Rectangle;
}

/**
 * OCR请求参数
 */
export interface OCRRequest {
  /** 图像数据 (base64) */
  imageData: string;
  /** 图像格式 */
  imageFormat: 'png' | 'jpg' | 'jpeg' | 'webp';
  /** 语言提示 */
  languageHints?: string[];
  /** OCR提供商 */
  provider?: string;
  /** 预处理选项 */
  preprocessing?: {
    resize?: boolean;
    enhance?: boolean;
    denoise?: boolean;
  };
}

// ================================
// 翻译相关类型
// ================================

/**
 * 翻译结果
 */
export interface TranslationResult {
  /** 原始文本 */
  originalText: string;
  /** 翻译文本 */
  translatedText: string;
  /** 置信度 (0-1) */
  confidence: number;
  /** 源语言 */
  sourceLanguage: string;
  /** 目标语言 */
  targetLanguage: string;
  /** 翻译提供商 */
  provider: string;
  /** 处理时间 (毫秒) */
  processingTime: number;
}

/**
 * 翻译请求参数
 */
export interface TranslationRequest {
  /** 要翻译的文本 */
  text: string;
  /** 源语言 (auto为自动检测) */
  sourceLanguage: string;
  /** 目标语言 */
  targetLanguage: string;
  /** 翻译提供商 */
  provider?: string;
  /** 额外选项 */
  options?: {
    /** 正式程度 */
    formality?: 'formal' | 'informal' | 'default';
    /** 保持格式 */
    preserveFormatting?: boolean;
  };
}

/**
 * 语言信息
 */
export interface LanguageInfo {
  /** 语言代码 */
  code: string;
  /** 语言名称 */
  name: string;
  /** 本地化名称 */
  localizedName?: string;
  /** 是否支持自动检测 */
  autoDetectSupported?: boolean;
}

// ================================
// WebSocket消息类型
// ================================

/**
 * 消息类型枚举
 */
export enum MessageType {
  // 连接相关
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  HEARTBEAT = 'heartbeat',
  
  // 眼动追踪
  GAZE_DATA = 'gaze_data',
  GAZE_START = 'gaze_start',
  GAZE_END = 'gaze_end',
  GAZE_TRIGGER = 'gaze_trigger',
  
  // 翻译相关
  TRANSLATION_REQUEST = 'translation_request',
  TRANSLATION_RESULT = 'translation_result',
  TRANSLATION_ERROR = 'translation_error',
  
  // 配置相关
  CONFIG_UPDATE = 'config_update',
  SETTINGS_UPDATE = 'settings_update',
  
  // 错误和状态
  ERROR = 'error',
  STATUS = 'status',
  
  // 调试信息
  DEBUG = 'debug'
}

/**
 * 基础消息结构
 */
export interface BaseMessage {
  /** 消息ID */
  id: string;
  /** 消息类型 */
  type: MessageType;
  /** 时间戳 */
  timestamp: number;
  /** 客户端ID (可选) */
  clientId?: string;
}

/**
 * 眼动数据消息
 */
export interface GazeDataMessage extends BaseMessage {
  type: MessageType.GAZE_DATA;
  data: EyeTrackingData;
}

/**
 * 注视开始消息
 */
export interface GazeStartMessage extends BaseMessage {
  type: MessageType.GAZE_START;
  data: GazeInfo;
}

/**
 * 注视结束消息
 */
export interface GazeEndMessage extends BaseMessage {
  type: MessageType.GAZE_END;
  data: GazeInfo;
}

/**
 * 注视触发消息
 */
export interface GazeTriggerMessage extends BaseMessage {
  type: MessageType.GAZE_TRIGGER;
  data: GazeInfo;
}

/**
 * 翻译请求消息
 */
export interface TranslationRequestMessage extends BaseMessage {
  type: MessageType.TRANSLATION_REQUEST;
  data: {
    /** 屏幕区域 */
    screenRegion: Rectangle;
    /** 翻译请求参数 */
    translationRequest: TranslationRequest;
    /** 关联的注视信息 */
    gazeInfo?: GazeInfo;
  };
}

/**
 * 翻译结果消息
 */
export interface TranslationResultMessage extends BaseMessage {
  type: MessageType.TRANSLATION_RESULT;
  data: {
    /** 翻译结果 */
    translationResult: TranslationResult;
    /** OCR结果 */
    ocrResult?: OCRResult;
    /** 关联的请求ID */
    requestId: string;
  };
}

/**
 * 配置更新消息
 */
export interface ConfigUpdateMessage extends BaseMessage {
  type: MessageType.CONFIG_UPDATE;
  data: {
    /** 眼动追踪设置 */
    eyeTracking?: EyeTrackingSettings;
    /** 注视检测设置 */
    gazeDetection?: GazeDetectionSettings;
    /** 翻译设置 */
    translation?: {
      sourceLanguage: string;
      targetLanguage: string;
      provider?: string;
    };
  };
}

/**
 * 错误消息
 */
export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR;
  data: {
    /** 错误代码 */
    code: string;
    /** 错误消息 */
    message: string;
    /** 错误详情 */
    details?: any;
    /** 关联的请求ID */
    requestId?: string;
  };
}

/**
 * 状态消息
 */
export interface StatusMessage extends BaseMessage {
  type: MessageType.STATUS;
  data: {
    /** 服务状态 */
    services: {
      eyeTracking: boolean;
      ocr: boolean;
      translation: boolean;
      websocket: boolean;
    };
    /** 连接信息 */
    connections: {
      total: number;
      active: number;
    };
    /** 性能信息 */
    performance?: {
      memoryUsage: number;
      cpuUsage: number;
      uptime: number;
    };
  };
}

/**
 * 心跳消息
 */
export interface HeartbeatMessage extends BaseMessage {
  type: MessageType.HEARTBEAT;
  data: {
    /** 客户端时间戳 */
    clientTimestamp?: number;
    /** 服务器时间戳 */
    serverTimestamp?: number;
  };
}

// ================================
// 联合类型
// ================================

/**
 * 所有消息类型的联合
 */
export type Message = 
  | GazeDataMessage
  | GazeStartMessage
  | GazeEndMessage
  | GazeTriggerMessage
  | TranslationRequestMessage
  | TranslationResultMessage
  | ConfigUpdateMessage
  | ErrorMessage
  | StatusMessage
  | HeartbeatMessage;

// ================================
// 错误类型
// ================================

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_MESSAGE_FORMAT = 'INVALID_MESSAGE_FORMAT',
  
  // 连接错误
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  
  // 眼动追踪错误
  EYE_TRACKING_NOT_SUPPORTED = 'EYE_TRACKING_NOT_SUPPORTED',
  EYE_TRACKING_PERMISSION_DENIED = 'EYE_TRACKING_PERMISSION_DENIED',
  EYE_TRACKING_INITIALIZATION_FAILED = 'EYE_TRACKING_INITIALIZATION_FAILED',
  
  // OCR错误
  OCR_SERVICE_UNAVAILABLE = 'OCR_SERVICE_UNAVAILABLE',
  OCR_PROCESSING_FAILED = 'OCR_PROCESSING_FAILED',
  OCR_INVALID_IMAGE = 'OCR_INVALID_IMAGE',
  OCR_NO_TEXT_FOUND = 'OCR_NO_TEXT_FOUND',
  
  // 翻译错误
  TRANSLATION_SERVICE_UNAVAILABLE = 'TRANSLATION_SERVICE_UNAVAILABLE',
  TRANSLATION_FAILED = 'TRANSLATION_FAILED',
  UNSUPPORTED_LANGUAGE = 'UNSUPPORTED_LANGUAGE',
  TRANSLATION_QUOTA_EXCEEDED = 'TRANSLATION_QUOTA_EXCEEDED',
  
  // 配置错误
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  MISSING_API_KEY = 'MISSING_API_KEY'
}

/**
 * 应用错误基类
 */
export interface AppError {
  code: ErrorCode;
  message: string;
  details?: any;
  timestamp: number;
}

// ================================
// 配置类型
// ================================

/**
 * 应用配置
 */
export interface AppConfig {
  /** 眼动追踪配置 */
  eyeTracking: EyeTrackingSettings;
  /** 注视检测配置 */
  gazeDetection: GazeDetectionSettings;
  /** 网络配置 */
  network: NetworkConfig;
  /** 翻译配置 */
  translation: TranslationConfig;
  /** UI配置 */
  ui: UIConfig;
  /** 调试配置 */
  debug: DebugConfig;
}

/**
 * 网络配置
 */
export interface NetworkConfig {
  /** 服务器地址 */
  serverHost: string;
  /** 服务器端口 */
  serverPort: number;
  /** 是否使用SSL */
  useSSL: boolean;
  /** 连接超时 (毫秒) */
  connectionTimeout: number;
  /** 重连次数 */
  reconnectAttempts: number;
  /** 重连延迟 (毫秒) */
  reconnectDelay: number;
  /** 心跳间隔 (毫秒) */
  heartbeatInterval: number;
}

/**
 * 翻译配置
 */
export interface TranslationConfig {
  /** 默认源语言 */
  defaultSourceLanguage: string;
  /** 默认目标语言 */
  defaultTargetLanguage: string;
  /** 支持的语言列表 */
  supportedLanguages: LanguageInfo[];
  /** 首选翻译提供商 */
  preferredProvider: string;
}

/**
 * UI配置
 */
export interface UIConfig {
  /** 翻译显示配置 */
  translationDisplay: {
    position: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center';
    maxWidth: number;
    maxHeight: number;
    backgroundColor: string;
    textColor: string;
    fontSize: number;
    fadeInDuration: number;
    fadeOutDuration: number;
    autoHideDelay: number;
  };
  /** 注视指示器配置 */
  gazeIndicator: {
    enabled: boolean;
    size: number;
    normalColor: string;
    gazingColor: string;
    triggeredColor: string;
    animationSpeed: number;
  };
}

/**
 * 调试配置
 */
export interface DebugConfig {
  /** 启用日志 */
  loggingEnabled: boolean;
  /** 日志级别 */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** 性能监控 */
  performanceMonitoring: boolean;
  /** 网络日志 */
  networkLogging: boolean;
  /** 眼动追踪调试 */
  eyeTrackingDebug: boolean;
}