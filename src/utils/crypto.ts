/**
 * 加密工具 - 使用crypto-js标准库
 * 
 * 使用专业的crypto-js库提供可靠的加密功能
 */

import CryptoJS from 'crypto-js';

/**
 * SHA-256哈希计算
 */
export function sha256(message: string): string {
  return CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
}

/**
 * 同步SHA-256哈希计算（与异步版本相同）
 */
export function sha256Sync(message: string): string {
  return sha256(message);
}

/**
 * 生成随机字节数组
 */
export function randomBytes(size: number): Uint8Array {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(size);
    window.crypto.getRandomValues(bytes);
    return bytes;
  } else {
    // 使用crypto-js生成随机数据
    const randomWords = CryptoJS.lib.WordArray.random(size);
    const randomHex = randomWords.toString(CryptoJS.enc.Hex);
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      bytes[i] = parseInt(randomHex.substr(i * 2, 2), 16);
    }
    return bytes;
  }
}

/**
 * 生成随机十六进制字符串
 */
export function randomHex(length: number): string {
  const randomWords = CryptoJS.lib.WordArray.random(Math.ceil(length / 2));
  return randomWords.toString(CryptoJS.enc.Hex).slice(0, length);
}

/**
 * HMAC-SHA256签名
 */
export function hmacSha256(message: string, key: string): string {
  return CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Hex);
}

/**
 * AES加密
 */
export function aesEncrypt(data: string, key: string): string {
  return CryptoJS.AES.encrypt(data, key).toString();
}

/**
 * AES解密
 */
export function aesDecrypt(encryptedData: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * 数字签名实现
 */
export class Signature {
  /**
   * 创建签名
   */
  static sign(message: string, privateKey: string): string {
    return hmacSha256(message, privateKey);
  }

  /**
   * 验证签名
   */
  static verify(message: string, signature: string, publicKey: string): boolean {
    const expectedSignature = this.sign(message, publicKey);
    return signature === expectedSignature;
  }
}

/**
 * Merkle树实现
 */
export class MerkleTree {
  /**
   * 计算Merkle树根
   */
  static calculateRoot(data: string[]): string {
    if (data.length === 0) {
      return sha256('');
    }

    let hashes = data.map(item => sha256(item));

    while (hashes.length > 1) {
      const newHashes: string[] = [];
      
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = i + 1 < hashes.length ? hashes[i + 1] : left;
        const combined = sha256(left + right);
        newHashes.push(combined);
      }
      
      hashes = newHashes;
    }

    return hashes[0];
  }

  /**
   * 验证Merkle证明
   */
  static verifyProof(leaf: string, proof: string[], root: string): boolean {
    let hash = sha256(leaf);
    
    for (const proofElement of proof) {
      hash = sha256(hash + proofElement);
    }
    
    return hash === root;
  }
}

/**
 * 工作量证明辅助函数
 */
export class ProofOfWork {
  /**
   * 验证工作量证明
   */
  static verify(data: string, nonce: number, difficulty: number): boolean {
    const hash = sha256(data + nonce.toString());
    const target = '0'.repeat(difficulty);
    return hash.startsWith(target);
  }

  /**
   * 计算难度目标
   */
  static getDifficultyTarget(difficulty: number): string {
    return '0'.repeat(difficulty);
  }

  /**
   * 估算挖矿时间
   */
  static estimateMiningTime(difficulty: number): number {
    // 基于难度估算挖矿时间（毫秒）
    const baseTime = 1000; // 1秒
    return baseTime * Math.pow(16, difficulty - 1);
  }
}

/**
 * 地址生成工具
 */
export class AddressGenerator {
  /**
   * 从公钥生成地址
   */
  static fromPublicKey(publicKey: string, prefix: string = 'cosmos'): string {
    const hash = sha256(publicKey);
    const addressSuffix = hash.slice(0, 40); // 取前20字节
    return `${prefix}1${addressSuffix}`;
  }

  /**
   * 验证地址格式
   */
  static isValid(address: string): boolean {
    // 简单的地址格式验证
    const regex = /^[a-z]+1[a-z0-9]{39}$/;
    return regex.test(address);
  }

  /**
   * 生成随机地址
   */
  static generateRandom(prefix: string = 'cosmos'): string {
    const randomData = randomHex(40);
    return `${prefix}1${randomData}`;
  }
}

/**
 * 时间戳工具
 */
export class TimestampUtil {
  /**
   * 获取当前时间戳
   */
  static now(): number {
    return Date.now();
  }

  /**
   * 时间戳转ISO字符串
   */
  static toISO(timestamp: number): string {
    return new Date(timestamp).toISOString();
  }

  /**
   * 格式化时间差
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天`;
    if (hours > 0) return `${hours}小时`;
    if (minutes > 0) return `${minutes}分钟`;
    return `${seconds}秒`;
  }
}

// 兼容性导出（保持向后兼容）
export const SimpleSignature = Signature;