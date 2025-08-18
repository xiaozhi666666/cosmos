/**
 * 区块链数据持久化存储
 * 
 * 提供区块链数据的本地存储功能，包括：
 * - 区块数据存储
 * - 交易数据存储  
 * - 账户余额存储
 * - 区块链状态持久化
 * 
 * 使用浏览器的 localStorage 进行数据持久化
 */

import { Block, Transaction, Blockchain } from './blockchain';

export interface StorageData {
  blocks: Block[];
  balances: { [address: string]: { [denom: string]: number } };
  chainStats: {
    difficulty: number;
    miningReward: number;
    totalBlocks: number;
    lastBlockTime: number;
  };
}

/**
 * 区块链存储管理器
 */
export class BlockchainStorage {
  private static readonly STORAGE_KEY = 'cosmos-blockchain';
  private static readonly BACKUP_KEY = 'cosmos-blockchain-backup';

  /**
   * 保存区块链数据到本地存储
   */
  static save(blockchain: Blockchain): boolean {
    try {
      const data: StorageData = {
        blocks: blockchain.chain,
        balances: this.serializeBalances(blockchain),
        chainStats: {
          difficulty: blockchain.difficulty,
          miningReward: blockchain.miningReward,
          totalBlocks: blockchain.chain.length,
          lastBlockTime: blockchain.getLatestBlock().timestamp
        }
      };

      const serializedData = JSON.stringify(data);
      
      // 先备份当前数据
      this.createBackup();
      
      // 保存新数据
      localStorage.setItem(this.STORAGE_KEY, serializedData);
      
      console.log(`区块链数据已保存 (${this.formatBytes(serializedData.length)})`);
      return true;
    } catch (error) {
      console.error('保存区块链数据失败:', error);
      return false;
    }
  }

  /**
   * 从本地存储加载区块链数据
   */
  static load(): StorageData | null {
    try {
      const serializedData = localStorage.getItem(this.STORAGE_KEY);
      if (!serializedData) {
        console.log('没有找到已保存的区块链数据');
        return null;
      }

      const data: StorageData = JSON.parse(serializedData);
      
      // 验证数据结构
      if (!this.validateStorageData(data)) {
        console.error('区块链数据结构无效');
        return this.loadBackup();
      }

      console.log(`区块链数据已加载: ${data.blocks.length} 个区块`);
      return data;
    } catch (error) {
      console.error('加载区块链数据失败:', error);
      return this.loadBackup();
    }
  }

  /**
   * 恢复区块链状态
   */
  static restore(blockchain: Blockchain): boolean {
    const data = this.load();
    if (!data) {
      return false;
    }

    try {
      // 重建区块链
      blockchain.chain = data.blocks.map(blockData => {
        const block = new Block(
          blockData.index,
          blockData.data,
          blockData.previousHash,
          blockData.difficulty,
          blockData.miner,
          blockData.reward
        );
        
        // 恢复区块的所有属性
        block.timestamp = blockData.timestamp;
        block.hash = blockData.hash;
        block.nonce = blockData.nonce;
        block.merkleRoot = blockData.merkleRoot;
        
        return block;
      });

      // 恢复链状态
      blockchain.difficulty = data.chainStats.difficulty;
      blockchain.miningReward = data.chainStats.miningReward;

      // 恢复余额
      this.deserializeBalances(blockchain, data.balances);

      // 验证恢复的区块链
      if (!blockchain.isChainValid()) {
        console.error('恢复的区块链无效');
        return false;
      }

      console.log(`区块链状态已恢复: ${blockchain.chain.length} 个区块`);
      return true;
    } catch (error) {
      console.error('恢复区块链状态失败:', error);
      return false;
    }
  }

  /**
   * 创建数据备份
   */
  private static createBackup(): void {
    try {
      const currentData = localStorage.getItem(this.STORAGE_KEY);
      if (currentData) {
        localStorage.setItem(this.BACKUP_KEY, currentData);
        console.log('已创建数据备份');
      }
    } catch (error) {
      console.warn('创建备份失败:', error);
    }
  }

  /**
   * 从备份加载数据
   */
  private static loadBackup(): StorageData | null {
    try {
      const backupData = localStorage.getItem(this.BACKUP_KEY);
      if (backupData) {
        console.log('正在从备份恢复数据...');
        const data: StorageData = JSON.parse(backupData);
        
        if (this.validateStorageData(data)) {
          return data;
        }
      }
    } catch (error) {
      console.error('从备份恢复数据失败:', error);
    }
    
    return null;
  }

  /**
   * 验证存储数据结构
   */
  private static validateStorageData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (!Array.isArray(data.blocks)) {
      return false;
    }

    if (!data.balances || typeof data.balances !== 'object') {
      return false;
    }

    if (!data.chainStats || typeof data.chainStats !== 'object') {
      return false;
    }

    // 验证必需的链状态属性
    const requiredStats = ['difficulty', 'miningReward', 'totalBlocks', 'lastBlockTime'];
    for (const stat of requiredStats) {
      if (!(stat in data.chainStats)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 序列化余额数据
   */
  private static serializeBalances(blockchain: Blockchain): { [address: string]: { [denom: string]: number } } {
    const balances: { [address: string]: { [denom: string]: number } } = {};
    
    // 遍历所有已知地址
    const addresses = new Set<string>();
    blockchain.chain.forEach(block => {
      block.data.forEach(tx => {
        if (tx.from !== 'system') addresses.add(tx.from);
        addresses.add(tx.to);
      });
    });

    // 获取每个地址的余额
    addresses.forEach(address => {
      const addressBalances = blockchain.getAllBalances(address);
      if (addressBalances.length > 0) {
        balances[address] = {};
        addressBalances.forEach(balance => {
          balances[address][balance.denom] = parseFloat(balance.amount);
        });
      }
    });

    return balances;
  }

  /**
   * 反序列化余额数据
   */
  private static deserializeBalances(
    blockchain: Blockchain, 
    balances: { [address: string]: { [denom: string]: number } }
  ): void {
    // 使用反射来访问私有的 balances 属性
    (blockchain as any).balances = new Map();
    
    Object.entries(balances).forEach(([address, addressBalances]) => {
      const balanceMap = new Map<string, number>();
      Object.entries(addressBalances).forEach(([denom, amount]) => {
        balanceMap.set(denom, amount);
      });
      (blockchain as any).balances.set(address, balanceMap);
    });
  }

  /**
   * 清除所有存储的数据
   */
  static clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.BACKUP_KEY);
    console.log('区块链存储数据已清除');
  }

  /**
   * 获取存储信息
   */
  static getStorageInfo(): {
    hasData: boolean;
    hasBackup: boolean;
    dataSize: string;
    backupSize: string;
  } {
    const data = localStorage.getItem(this.STORAGE_KEY);
    const backup = localStorage.getItem(this.BACKUP_KEY);

    return {
      hasData: !!data,
      hasBackup: !!backup,
      dataSize: data ? this.formatBytes(data.length) : '0 B',
      backupSize: backup ? this.formatBytes(backup.length) : '0 B'
    };
  }

  /**
   * 导出区块链数据为JSON
   */
  static export(): string | null {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data;
  }

  /**
   * 从JSON导入区块链数据
   */
  static import(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (!this.validateStorageData(data)) {
        console.error('导入的数据格式无效');
        return false;
      }

      // 备份当前数据
      this.createBackup();
      
      // 保存导入的数据
      localStorage.setItem(this.STORAGE_KEY, jsonData);
      
      console.log('区块链数据导入成功');
      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      return false;
    }
  }

  /**
   * 自动保存功能
   */
  static enableAutoSave(blockchain: Blockchain, interval: number = 60000): NodeJS.Timeout {
    console.log(`已启用自动保存，间隔: ${interval / 1000}s`);
    
    return setInterval(() => {
      this.save(blockchain);
    }, interval);
  }

  /**
   * 格式化字节大小
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 数据压缩（简单的JSON压缩）
   */
  private static compress(data: string): string {
    // 移除不必要的空格
    return data.replace(/\s+/g, '');
  }

  /**
   * 数据解压缩
   */
  private static decompress(compressedData: string): string {
    // 对于简单压缩，直接返回
    return compressedData;
  }
}

/**
 * 区块链快照管理器
 */
export class SnapshotManager {
  private static readonly SNAPSHOT_PREFIX = 'cosmos-snapshot-';

  /**
   * 创建区块链快照
   */
  static createSnapshot(blockchain: Blockchain, name?: string): string {
    const timestamp = Date.now();
    const snapshotName = name || `snapshot-${timestamp}`;
    const snapshotKey = this.SNAPSHOT_PREFIX + snapshotName;

    try {
      const data: StorageData = {
        blocks: blockchain.chain,
        balances: BlockchainStorage['serializeBalances'](blockchain),
        chainStats: {
          difficulty: blockchain.difficulty,
          miningReward: blockchain.miningReward,
          totalBlocks: blockchain.chain.length,
          lastBlockTime: blockchain.getLatestBlock().timestamp
        }
      };

      localStorage.setItem(snapshotKey, JSON.stringify(data));
      console.log(`区块链快照已创建: ${snapshotName}`);
      
      return snapshotName;
    } catch (error) {
      console.error('创建快照失败:', error);
      throw error;
    }
  }

  /**
   * 恢复区块链快照
   */
  static restoreSnapshot(blockchain: Blockchain, snapshotName: string): boolean {
    const snapshotKey = this.SNAPSHOT_PREFIX + snapshotName;

    try {
      const snapshotData = localStorage.getItem(snapshotKey);
      if (!snapshotData) {
        console.error(`快照不存在: ${snapshotName}`);
        return false;
      }

      const data: StorageData = JSON.parse(snapshotData);
      
      // 临时保存到主存储位置
      localStorage.setItem(BlockchainStorage['STORAGE_KEY'], snapshotData);
      
      // 使用存储管理器恢复
      const success = BlockchainStorage.restore(blockchain);
      
      if (success) {
        console.log(`已从快照恢复: ${snapshotName}`);
      }
      
      return success;
    } catch (error) {
      console.error('恢复快照失败:', error);
      return false;
    }
  }

  /**
   * 列出所有快照
   */
  static listSnapshots(): { name: string; timestamp: number; size: string }[] {
    const snapshots: { name: string; timestamp: number; size: string }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.SNAPSHOT_PREFIX)) {
        const snapshotName = key.replace(this.SNAPSHOT_PREFIX, '');
        const data = localStorage.getItem(key);
        
        if (data) {
          // 尝试从快照名称提取时间戳
          const timestampMatch = snapshotName.match(/snapshot-(\d+)/);
          const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();
          
          snapshots.push({
            name: snapshotName,
            timestamp: timestamp,
            size: BlockchainStorage['formatBytes'](data.length)
          });
        }
      }
    }

    return snapshots.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 删除快照
   */
  static deleteSnapshot(snapshotName: string): boolean {
    const snapshotKey = this.SNAPSHOT_PREFIX + snapshotName;
    
    if (localStorage.getItem(snapshotKey)) {
      localStorage.removeItem(snapshotKey);
      console.log(`快照已删除: ${snapshotName}`);
      return true;
    } else {
      console.error(`快照不存在: ${snapshotName}`);
      return false;
    }
  }
}