/**
 * 共享工具函数
 * 前端和后端通用的工具函数
 */

import { 
  Vector3, 
  Point2D, 
  Rectangle, 
  LanguageCode, 
  SUPPORTED_LANGUAGES,
  REGEX_PATTERNS 
} from '../constants/index';

// ================================
// 数学工具函数
// ================================

/**
 * 计算两个3D点之间的距离
 */
export function distance3D(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 计算两个2D点之间的距离
 */
export function distance2D(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 向量归一化
 */
export function normalize(vector: Vector3): Vector3 {
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
  if (length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

/**
 * 向量点积
 */
export function dotProduct(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * 向量叉积
 */
export function crossProduct(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

/**
 * 线性插值
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * 向量线性插值
 */
export function lerpVector3(a: Vector3, b: Vector3, t: number): Vector3 {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    x: lerp(a.x, b.x, clampedT),
    y: lerp(a.y, b.y, clampedT),
    z: lerp(a.z, b.z, clampedT)
  };
}

/**
 * 角度转弧度
 */
export function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * 弧度转角度
 */
export function radiansToDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

/**
 * 限制数值在指定范围内
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ================================
// 几何工具函数
// ================================

/**
 * 检查点是否在矩形内
 */
export function isPointInRectangle(point: Point2D, rect: Rectangle): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * 检查两个矩形是否重叠
 */
export function rectanglesOverlap(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * 计算矩形中心点
 */
export function getRectangleCenter(rect: Rectangle): Point2D {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
}

/**
 * 计算矩形面积
 */
export function getRectangleArea(rect: Rectangle): number {
  return rect.width * rect.height;
}

/**
 * 扩展矩形
 */
export function expandRectangle(rect: Rectangle, padding: number): Rectangle {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2
  };
}

// ================================
// 字符串工具函数
// ================================

/**
 * 生成UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 生成短ID
 */
export function generateShortId(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 清理文本 (移除多余空白)
 */
export function cleanText(text: string): string {
  return text.replace(REGEX_PATTERNS.WHITESPACE_CLEANUP, ' ').trim();
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 首字母大写
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * 驼峰命名转下划线
 */
export function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * 下划线转驼峰命名
 */
export function snakeToCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 检查字符串是否为有效的语言代码
 */
export function isValidLanguageCode(code: string): code is LanguageCode {
  return REGEX_PATTERNS.LANGUAGE_CODE.test(code) && code in SUPPORTED_LANGUAGES;
}

// ================================
// 时间工具函数
// ================================

/**
 * 获取当前时间戳 (毫秒)
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number, format: 'date' | 'time' | 'datetime' = 'datetime'): string {
  const date = new Date(timestamp);
  
  switch (format) {
    case 'date':
      return date.toLocaleDateString();
    case 'time':
      return date.toLocaleTimeString();
    case 'datetime':
    default:
      return date.toLocaleString();
  }
}

/**
 * 计算时间差 (毫秒)
 */
export function getTimeDifference(start: number, end: number = Date.now()): number {
  return end - start;
}

/**
 * 格式化持续时间
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * 睡眠函数 (Promise)
 */
export function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

// ================================
// 数据验证工具函数
// ================================

/**
 * 检查值是否为null或undefined
 */
export function isNullOrUndefined(value: any): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * 检查对象是否为空
 */
export function isEmptyObject(obj: any): boolean {
  return obj === null || obj === undefined || Object.keys(obj).length === 0;
}

/**
 * 检查数组是否为空
 */
export function isEmptyArray(arr: any): boolean {
  return !Array.isArray(arr) || arr.length === 0;
}

/**
 * 深度相等比较
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

/**
 * 验证URL格式
 */
export function isValidUrl(url: string): boolean {
  return REGEX_PATTERNS.URL.test(url);
}

/**
 * 验证颜色代码格式
 */
export function isValidHexColor(color: string): boolean {
  return REGEX_PATTERNS.HEX_COLOR.test(color);
}

// ================================
// 数组工具函数
// ================================

/**
 * 数组去重
 */
export function uniqueArray<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * 数组分组
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

/**
 * 数组随机排序
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 获取数组中的随机元素
 */
export function getRandomElement<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 数组分块
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// ================================
// 对象工具函数
// ================================

/**
 * 深拷贝对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * 合并对象 (深度合并)
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = deepClone(target);
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];
      
      if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(sourceValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue as any);
      } else {
        result[key] = sourceValue as any;
      }
    }
  }
  
  return result;
}

/**
 * 获取嵌套对象属性值
 */
export function getNestedProperty(obj: any, path: string, defaultValue: any = undefined): any {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current;
}

/**
 * 设置嵌套对象属性值
 */
export function setNestedProperty(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

// ================================
// 性能工具函数
// ================================

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCallTime >= delay) {
      func(...args);
      lastCallTime = now;
    }
  };
}

/**
 * 性能测量
 */
export function measurePerformance<T>(
  name: string,
  func: () => T
): { result: T; duration: number } {
  const startTime = performance.now();
  const result = func();
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`Performance [${name}]: ${duration.toFixed(2)}ms`);
  
  return { result, duration };
}

/**
 * 异步性能测量
 */
export async function measureAsyncPerformance<T>(
  name: string,
  func: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await func();
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`Async Performance [${name}]: ${duration.toFixed(2)}ms`);
  
  return { result, duration };
}