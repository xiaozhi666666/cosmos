/**
 * JSON 工具函数 - 支持 BigInt 序列化
 * 
 * 解决 CosmJS 返回的 BigInt 无法被 JSON.stringify 序列化的问题
 */

/**
 * 安全的 JSON 序列化，支持 BigInt
 */
export function safeJsonStringify(obj: any, space?: string | number): string {
  return JSON.stringify(obj, (key, value) => {
    // 处理 BigInt
    if (typeof value === 'bigint') {
      return value.toString();
    }
    
    // 处理函数
    if (typeof value === 'function') {
      return '[Function]';
    }
    
    // 处理 undefined
    if (value === undefined) {
      return null;
    }
    
    // 处理循环引用
    if (typeof value === 'object' && value !== null) {
      // 检查是否是循环引用（简单检查）
      try {
        JSON.stringify(value);
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('circular')) {
          return '[Circular]';
        }
      }
    }
    
    return value;
  }, space);
}

/**
 * 安全的 JSON 解析，支持 BigInt
 */
export function safeJsonParse(text: string): any {
  return JSON.parse(text, (key, value) => {
    // 尝试解析可能的 BigInt 字符串
    if (typeof value === 'string' && /^\d+$/.test(value) && value.length > 15) {
      try {
        return BigInt(value);
      } catch {
        return value;
      }
    }
    
    return value;
  });
}

/**
 * 转换对象中的 BigInt 为字符串
 */
export function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertBigIntToString(value);
    }
    return result;
  }
  
  return obj;
}

/**
 * 格式化显示对象，处理 BigInt 和其他特殊类型
 */
export function formatForDisplay(obj: any, space: string | number = 2): string {
  const converted = convertBigIntToString(obj);
  return JSON.stringify(converted, null, space);
}

/**
 * 检查对象是否包含 BigInt
 */
export function containsBigInt(obj: any): boolean {
  if (obj === null || obj === undefined) {
    return false;
  }
  
  if (typeof obj === 'bigint') {
    return true;
  }
  
  if (Array.isArray(obj)) {
    return obj.some(containsBigInt);
  }
  
  if (typeof obj === 'object') {
    return Object.values(obj).some(containsBigInt);
  }
  
  return false;
}

/**
 * RPC 响应序列化器 - 专门用于 RPC 响应
 */
export function serializeRpcResponse(response: any): string {
  try {
    return safeJsonStringify(response);
  } catch (error) {
    console.warn('RPC响应序列化失败，使用备用方法:', error);
    // 备用序列化方法
    return safeJsonStringify({
      ...response,
      result: convertBigIntToString(response.result),
      error: response.error ? convertBigIntToString(response.error) : undefined
    });
  }
}
