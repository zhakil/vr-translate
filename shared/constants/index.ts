/**
 * 共享常量定义
 * 前端和后端使用的通用常量
 */

// ================================
// 应用常量
// ================================

export const APP_NAME = 'VR Eye Gaze Translation';
export const APP_VERSION = '1.0.0';
export const PROTOCOL_VERSION = '1.0.0';

// ================================
// 网络常量
// ================================

export const DEFAULT_SERVER_HOST = 'localhost';
export const DEFAULT_SERVER_PORT = 8080;
export const DEFAULT_WEBSOCKET_PORT = 8081;

export const CONNECTION_TIMEOUT = 10000; // 10秒
export const RECONNECT_ATTEMPTS = 5;
export const RECONNECT_DELAY = 2000; // 2秒
export const HEARTBEAT_INTERVAL = 30000; // 30秒
export const MESSAGE_TIMEOUT = 10000; // 10秒

export const MAX_MESSAGE_SIZE = 1024 * 1024; // 1MB
export const MAX_QUEUE_SIZE = 100;

// ================================
// 眼动追踪常量
// ================================

export const DEFAULT_EYE_TRACKING_UPDATE_RATE = 60; // Hz
export const MIN_EYE_TRACKING_UPDATE_RATE = 30; // Hz
export const MAX_EYE_TRACKING_UPDATE_RATE = 120; // Hz

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
export const MIN_CONFIDENCE_THRESHOLD = 0.5;
export const MAX_CONFIDENCE_THRESHOLD = 1.0;

export const DEFAULT_GAZE_RAY_LENGTH = 100.0;
export const MIN_GAZE_RAY_LENGTH = 1.0;
export const MAX_GAZE_RAY_LENGTH = 1000.0;

// ================================
// 注视检测常量
// ================================

export const DEFAULT_GAZE_THRESHOLD = 1.5; // 秒
export const MIN_GAZE_THRESHOLD = 0.5; // 秒
export const MAX_GAZE_THRESHOLD = 10.0; // 秒

export const DEFAULT_GAZE_RADIUS = 0.5;
export const MIN_GAZE_RADIUS = 0.1;
export const MAX_GAZE_RADIUS = 2.0;

export const GAZE_STABILIZATION_TIME = 100; // 毫秒
export const GAZE_DEBOUNCE_TIME = 50; // 毫秒

// ================================
// OCR常量
// ================================

export const DEFAULT_OCR_TIMEOUT = 10000; // 10秒
export const MAX_OCR_TIMEOUT = 30000; // 30秒

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGE_WIDTH = 4096;
export const MAX_IMAGE_HEIGHT = 4096;

export const DEFAULT_OCR_CONFIDENCE_THRESHOLD = 0.5;
export const MIN_OCR_CONFIDENCE_THRESHOLD = 0.1;
export const MAX_OCR_CONFIDENCE_THRESHOLD = 1.0;

// 支持的图像格式
export const SUPPORTED_IMAGE_FORMATS = ['png', 'jpg', 'jpeg', 'webp'] as const;
export type SupportedImageFormat = typeof SUPPORTED_IMAGE_FORMATS[number];

// OCR提供商
export const OCR_PROVIDERS = {
  GOOGLE_VISION: 'google_vision',
  TESSERACT: 'tesseract',
  AZURE_CV: 'azure_cv',
  AWS_TEXTRACT: 'aws_textract'
} as const;

// ================================
// 翻译常量
// ================================

export const DEFAULT_TRANSLATION_TIMEOUT = 5000; // 5秒
export const MAX_TRANSLATION_TIMEOUT = 15000; // 15秒

export const MAX_TEXT_LENGTH = 5000; // 字符
export const MIN_TEXT_LENGTH = 1; // 字符

export const DEFAULT_TRANSLATION_CONFIDENCE_THRESHOLD = 0.7;
export const MIN_TRANSLATION_CONFIDENCE_THRESHOLD = 0.5;
export const MAX_TRANSLATION_CONFIDENCE_THRESHOLD = 1.0;

// 翻译提供商
export const TRANSLATION_PROVIDERS = {
  GOOGLE_TRANSLATE: 'google_translate',
  DEEPL: 'deepl',
  AZURE_TRANSLATOR: 'azure_translator',
  AWS_TRANSLATE: 'aws_translate',
  MICROSOFT_TRANSLATOR: 'microsoft_translator'
} as const;

// 自动检测语言代码
export const AUTO_DETECT_LANGUAGE = 'auto';

// ================================
// 语言常量
// ================================

/**
 * 支持的语言代码和名称
 */
export const SUPPORTED_LANGUAGES = {
  auto: 'Auto Detect',
  en: 'English',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
  th: 'Thai',
  vi: 'Vietnamese',
  nl: 'Dutch',
  sv: 'Swedish',
  no: 'Norwegian',
  da: 'Danish',
  fi: 'Finnish',
  pl: 'Polish',
  cs: 'Czech',
  hu: 'Hungarian',
  ro: 'Romanian',
  bg: 'Bulgarian',
  hr: 'Croatian',
  sk: 'Slovak',
  sl: 'Slovenian',
  et: 'Estonian',
  lv: 'Latvian',
  lt: 'Lithuanian',
  mt: 'Maltese',
  el: 'Greek',
  tr: 'Turkish',
  he: 'Hebrew',
  fa: 'Persian',
  ur: 'Urdu',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
  kn: 'Kannada',
  gu: 'Gujarati',
  pa: 'Punjabi',
  mr: 'Marathi',
  ne: 'Nepali',
  si: 'Sinhala',
  my: 'Myanmar',
  km: 'Khmer',
  lo: 'Lao',
  ka: 'Georgian',
  am: 'Amharic',
  sw: 'Swahili',
  zu: 'Zulu',
  af: 'Afrikaans',
  is: 'Icelandic',
  ga: 'Irish',
  cy: 'Welsh',
  eu: 'Basque',
  ca: 'Catalan',
  gl: 'Galician',
  la: 'Latin',
  eo: 'Esperanto'
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

/**
 * 常用语言对
 */
export const COMMON_LANGUAGE_PAIRS = [
  { source: 'en', target: 'zh-CN' },
  { source: 'en', target: 'ja' },
  { source: 'en', target: 'ko' },
  { source: 'en', target: 'es' },
  { source: 'en', target: 'fr' },
  { source: 'en', target: 'de' },
  { source: 'zh-CN', target: 'en' },
  { source: 'ja', target: 'en' },
  { source: 'ko', target: 'en' },
  { source: 'es', target: 'en' },
  { source: 'fr', target: 'en' },
  { source: 'de', target: 'en' }
] as const;

// ================================
// UI常量
// ================================

export const UI_POSITIONS = {
  TOP_LEFT: 'top_left',
  TOP_RIGHT: 'top_right',
  BOTTOM_LEFT: 'bottom_left',
  BOTTOM_RIGHT: 'bottom_right',
  CENTER: 'center'
} as const;

export type UIPosition = typeof UI_POSITIONS[keyof typeof UI_POSITIONS];

export const DEFAULT_UI_POSITION: UIPosition = UI_POSITIONS.BOTTOM_RIGHT;

// UI尺寸常量
export const DEFAULT_TRANSLATION_PANEL_WIDTH = 400;
export const DEFAULT_TRANSLATION_PANEL_HEIGHT = 200;
export const MIN_TRANSLATION_PANEL_WIDTH = 200;
export const MIN_TRANSLATION_PANEL_HEIGHT = 100;
export const MAX_TRANSLATION_PANEL_WIDTH = 800;
export const MAX_TRANSLATION_PANEL_HEIGHT = 600;

// UI动画常量
export const DEFAULT_FADE_DURATION = 0.3; // 秒
export const DEFAULT_AUTO_HIDE_DELAY = 5.0; // 秒
export const MIN_AUTO_HIDE_DELAY = 1.0; // 秒
export const MAX_AUTO_HIDE_DELAY = 30.0; // 秒

// 字体大小常量
export const DEFAULT_FONT_SIZE = 16;
export const MIN_FONT_SIZE = 12;
export const MAX_FONT_SIZE = 32;

// 颜色常量
export const UI_COLORS = {
  // 注视指示器颜色
  GAZE_NORMAL: '#FFFFFF',
  GAZE_GAZING: '#FFFF00',
  GAZE_TRIGGERED: '#00FF00',
  
  // 翻译面板颜色
  PANEL_BACKGROUND: '#000000CC',
  PANEL_BORDER: '#FFFFFF66',
  
  // 文本颜色
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#CCCCCC',
  TEXT_ERROR: '#FF6B6B',
  TEXT_SUCCESS: '#51CF66',
  TEXT_WARNING: '#FFD93D'
} as const;

// ================================
// 性能常量
// ================================

export const TARGET_FRAMERATE = 90; // FPS
export const MIN_FRAMERATE = 60; // FPS

export const MEMORY_WARNING_THRESHOLD = 0.8; // 80%
export const MEMORY_CRITICAL_THRESHOLD = 0.9; // 90%

export const CPU_WARNING_THRESHOLD = 0.7; // 70%
export const CPU_CRITICAL_THRESHOLD = 0.85; // 85%

// 缓存常量
export const DEFAULT_CACHE_TTL = 3600; // 1小时 (秒)
export const MAX_CACHE_SIZE = 1000; // 条目数
export const CACHE_CLEANUP_INTERVAL = 300; // 5分钟 (秒)

// ================================
// 调试常量
// ================================

export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
} as const;

export type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];

export const DEFAULT_LOG_LEVEL: LogLevel = LOG_LEVELS.INFO;

// ================================
// VR设备常量
// ================================

export const VR_DEVICES = {
  PICO_4: 'pico_4',
  PICO_3: 'pico_3',
  QUEST_3: 'quest_3',
  QUEST_2: 'quest_2',
  QUEST_PRO: 'quest_pro',
  VIVE_PRO_EYE: 'vive_pro_eye',
  VARJO_AERO: 'varjo_aero',
  GENERIC_OPENXR: 'generic_openxr'
} as const;

export type VRDevice = typeof VR_DEVICES[keyof typeof VR_DEVICES];

// VR SDK常量
export const VR_SDKS = {
  PICO_SDK: 'pico_sdk',
  META_QUEST_SDK: 'meta_quest_sdk',
  OPENXR: 'openxr',
  STEAM_VR: 'steam_vr',
  WAVE_SDK: 'wave_sdk'
} as const;

export type VRSDK = typeof VR_SDKS[keyof typeof VR_SDKS];

// 眼动追踪支持
export const EYE_TRACKING_SUPPORT = {
  [VR_DEVICES.PICO_4]: true,
  [VR_DEVICES.PICO_3]: false,
  [VR_DEVICES.QUEST_3]: true,
  [VR_DEVICES.QUEST_2]: false,
  [VR_DEVICES.QUEST_PRO]: true,
  [VR_DEVICES.VIVE_PRO_EYE]: true,
  [VR_DEVICES.VARJO_AERO]: true,
  [VR_DEVICES.GENERIC_OPENXR]: true // 取决于具体设备
} as const;

// ================================
// 错误常量
// ================================

export const ERROR_RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // 毫秒
export const MAX_ERROR_RETRY_ATTEMPTS = 3;

export const API_RATE_LIMITS = {
  GOOGLE_VISION: {
    requestsPerMinute: 1800,
    requestsPerMonth: 1000000
  },
  GOOGLE_TRANSLATE: {
    requestsPerMinute: 100,
    charactersPerMonth: 500000
  },
  DEEPL: {
    requestsPerMinute: 100,
    charactersPerMonth: 500000
  }
} as const;

// ================================
// 文件系统常量
// ================================

export const LOG_FILE_MAX_SIZE = 20 * 1024 * 1024; // 20MB
export const LOG_FILE_MAX_FILES = 5;

export const CONFIG_FILE_NAME = 'vr-translate-config.json';
export const CACHE_FILE_NAME = 'vr-translate-cache.json';
export const LOG_DIR_NAME = 'logs';

// ================================
// 正则表达式常量
// ================================

export const REGEX_PATTERNS = {
  // 语言代码验证 (ISO 639-1, ISO 639-3, 或带地区代码)
  LANGUAGE_CODE: /^[a-z]{2,3}(-[A-Z]{2})?$/,
  
  // 消息ID格式
  MESSAGE_ID: /^[a-zA-Z0-9_-]+$/,
  
  // 客户端ID格式
  CLIENT_ID: /^[a-zA-Z0-9_-]{8,32}$/,
  
  // 版本号格式 (语义版本)
  VERSION: /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?$/,
  
  // 颜色代码 (HEX)
  HEX_COLOR: /^#[0-9A-Fa-f]{6,8}$/,
  
  // URL验证
  URL: /^https?:\/\/[^\s/$.?#].[^\s]*$/,
  
  // 文本清理 (移除多余空白)
  WHITESPACE_CLEANUP: /\s+/g
} as const;