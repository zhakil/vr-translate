/**
 * WebSocket通信协议定义
 * 定义前端和后端之间的通信规范
 */

import { 
  Message, 
  MessageType, 
  BaseMessage,
  ErrorCode,
  AppError
} from '../types/index';

// ================================
// 协议版本和常量
// ================================

/**
 * 协议版本
 */
export const PROTOCOL_VERSION = '1.0.0';

/**
 * 消息优先级
 */
export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * 连接状态
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// ================================
// 协议配置
// ================================

/**
 * WebSocket协议配置
 */
export interface WebSocketProtocolConfig {
  /** 协议版本 */
  version: string;
  /** 最大消息大小 (字节) */
  maxMessageSize: number;
  /** 心跳间隔 (毫秒) */
  heartbeatInterval: number;
  /** 消息超时 (毫秒) */
  messageTimeout: number;
  /** 是否启用压缩 */
  compressionEnabled: boolean;
  /** 消息队列大小 */
  messageQueueSize: number;
  /** 重连配置 */
  reconnect: {
    enabled: boolean;
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
}

/**
 * 默认协议配置
 */
export const DEFAULT_PROTOCOL_CONFIG: WebSocketProtocolConfig = {
  version: PROTOCOL_VERSION,
  maxMessageSize: 1024 * 1024, // 1MB
  heartbeatInterval: 30000, // 30秒
  messageTimeout: 10000, // 10秒
  compressionEnabled: true,
  messageQueueSize: 100,
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  }
};

// ================================
// 消息封装
// ================================

/**
 * 扩展的消息结构
 */
export interface ExtendedMessage extends BaseMessage {
  /** 协议版本 */
  version: string;
  /** 消息优先级 */
  priority: MessagePriority;
  /** 是否需要确认 */
  requiresAck: boolean;
  /** 重试次数 */
  retryCount?: number;
  /** 过期时间 */
  expiresAt?: number;
  /** 压缩类型 */
  compression?: 'gzip' | 'deflate' | 'none';
}

/**
 * 消息确认
 */
export interface MessageAck {
  /** 原消息ID */
  messageId: string;
  /** 确认时间戳 */
  timestamp: number;
  /** 处理状态 */
  status: 'success' | 'error';
  /** 错误信息 (如果有) */
  error?: AppError;
}

/**
 * 批量消息
 */
export interface BatchMessage extends BaseMessage {
  type: MessageType.DEBUG; // 使用DEBUG类型标识批量消息
  data: {
    messages: Message[];
    batchId: string;
    totalCount: number;
  };
}

// ================================
// 连接管理
// ================================

/**
 * 连接握手消息
 */
export interface HandshakeMessage extends BaseMessage {
  type: MessageType.CONNECT;
  data: {
    /** 协议版本 */
    protocolVersion: string;
    /** 客户端信息 */
    clientInfo: {
      type: 'vr_frontend' | 'web_client' | 'mobile_app';
      version: string;
      platform: string;
      capabilities: string[];
    };
    /** 认证信息 (如果需要) */
    auth?: {
      token?: string;
      apiKey?: string;
    };
    /** 客户端配置 */
    config?: Partial<WebSocketProtocolConfig>;
  };
}

/**
 * 连接响应消息
 */
export interface HandshakeResponseMessage extends BaseMessage {
  type: MessageType.CONNECT;
  data: {
    /** 连接是否成功 */
    success: boolean;
    /** 分配的客户端ID */
    clientId: string;
    /** 服务器信息 */
    serverInfo: {
      version: string;
      capabilities: string[];
      supportedProtocols: string[];
    };
    /** 协议配置 */
    protocolConfig: WebSocketProtocolConfig;
    /** 错误信息 (如果连接失败) */
    error?: AppError;
  };
}

/**
 * 断开连接消息
 */
export interface DisconnectMessage extends BaseMessage {
  type: MessageType.DISCONNECT;
  data: {
    /** 断开原因 */
    reason: 'client_request' | 'server_shutdown' | 'timeout' | 'error';
    /** 详细信息 */
    message?: string;
    /** 是否可以重连 */
    canReconnect: boolean;
  };
}

// ================================
// 消息路由和处理
// ================================

/**
 * 消息路由信息
 */
export interface MessageRoute {
  /** 源客户端ID */
  from: string;
  /** 目标客户端ID (可选，服务器广播时使用) */
  to?: string;
  /** 路由路径 */
  path: string[];
}

/**
 * 消息处理器接口
 */
export interface MessageHandler<T extends Message = Message> {
  /** 支持的消息类型 */
  messageType: MessageType;
  /** 处理消息 */
  handle(message: T, context: MessageContext): Promise<Message | void>;
  /** 验证消息格式 */
  validate?(message: T): boolean;
}

/**
 * 消息处理上下文
 */
export interface MessageContext {
  /** 客户端ID */
  clientId: string;
  /** WebSocket连接 */
  connection: any; // WebSocket类型
  /** 路由信息 */
  route: MessageRoute;
  /** 处理时间戳 */
  timestamp: number;
  /** 请求ID (用于关联请求和响应) */
  requestId?: string;
}

// ================================
// 错误处理
// ================================

/**
 * 协议错误
 */
export class ProtocolError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: any;

  constructor(code: ErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'ProtocolError';
    this.code = code;
    this.details = details;
  }

  public toErrorMessage(messageId: string): ErrorMessage {
    return {
      id: messageId,
      type: MessageType.ERROR,
      timestamp: Date.now(),
      data: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
}

/**
 * 创建错误消息
 */
export function createErrorMessage(
  error: Error | AppError,
  requestId?: string
): ErrorMessage {
  const isAppError = 'code' in error;
  
  return {
    id: generateMessageId(),
    type: MessageType.ERROR,
    timestamp: Date.now(),
    data: {
      code: isAppError ? error.code : ErrorCode.UNKNOWN_ERROR,
      message: error.message,
      details: isAppError ? error.details : undefined,
      requestId
    }
  };
}

// ================================
// 消息工具函数
// ================================

/**
 * 生成消息ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 验证消息格式
 */
export function validateMessage(data: any): data is Message {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const message = data as Message;
  
  return (
    typeof message.id === 'string' &&
    Object.values(MessageType).includes(message.type) &&
    typeof message.timestamp === 'number' &&
    message.data !== undefined
  );
}

/**
 * 创建基础消息
 */
export function createBaseMessage(
  type: MessageType,
  data: any,
  clientId?: string
): BaseMessage {
  return {
    id: generateMessageId(),
    type,
    timestamp: Date.now(),
    clientId,
    data
  };
}

/**
 * 创建扩展消息
 */
export function createExtendedMessage(
  type: MessageType,
  data: any,
  options: {
    clientId?: string;
    priority?: MessagePriority;
    requiresAck?: boolean;
    expiresIn?: number;
  } = {}
): ExtendedMessage {
  const baseMessage = createBaseMessage(type, data, options.clientId);
  
  return {
    ...baseMessage,
    version: PROTOCOL_VERSION,
    priority: options.priority || MessagePriority.NORMAL,
    requiresAck: options.requiresAck || false,
    expiresAt: options.expiresIn ? Date.now() + options.expiresIn : undefined
  };
}

/**
 * 序列化消息
 */
export function serializeMessage(message: Message): string {
  try {
    return JSON.stringify(message);
  } catch (error) {
    throw new ProtocolError(
      ErrorCode.INVALID_MESSAGE_FORMAT,
      'Failed to serialize message',
      error
    );
  }
}

/**
 * 反序列化消息
 */
export function deserializeMessage(data: string): Message {
  try {
    const parsed = JSON.parse(data);
    
    if (!validateMessage(parsed)) {
      throw new ProtocolError(
        ErrorCode.INVALID_MESSAGE_FORMAT,
        'Invalid message format'
      );
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof ProtocolError) {
      throw error;
    }
    
    throw new ProtocolError(
      ErrorCode.INVALID_MESSAGE_FORMAT,
      'Failed to parse message',
      error
    );
  }
}

// ================================
// 连接状态管理
// ================================

/**
 * 连接状态变化事件
 */
export interface ConnectionStateEvent {
  /** 新状态 */
  state: ConnectionState;
  /** 前一个状态 */
  previousState: ConnectionState;
  /** 时间戳 */
  timestamp: number;
  /** 原因 (如果有) */
  reason?: string;
  /** 错误信息 (如果有) */
  error?: AppError;
}

/**
 * 连接统计信息
 */
export interface ConnectionStats {
  /** 连接开始时间 */
  connectedAt: number;
  /** 最后活动时间 */
  lastActivity: number;
  /** 发送的消息数 */
  messagesSent: number;
  /** 接收的消息数 */
  messagesReceived: number;
  /** 错误数 */
  errorCount: number;
  /** 重连次数 */
  reconnectCount: number;
  /** 平均延迟 (毫秒) */
  averageLatency: number;
}

// ================================
// 类型导出
// ================================

export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR;
  data: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
  };
}