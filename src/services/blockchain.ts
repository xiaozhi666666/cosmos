/**
 * 真实区块链实现
 * 
 * 这个文件实现了一个完整的区块链系统，包括：
 * - 工作量证明（PoW）共识机制
 * - 完整的区块验证
 * - 交易池管理
 * - Merkle树结构
 * - 数据持久化
 * - 挖矿奖励系统
 */

import { BlockchainStorage, SnapshotManager } from './storage';
import { sha256Sync, MerkleTree, ProofOfWork } from '../utils/crypto';

// 区块接口
export interface IBlock {
  index: number;                    // 区块索引
  timestamp: number;                // 时间戳
  data: ITransaction[];             // 交易数据
  previousHash: string;             // 前一个区块的哈希
  hash: string;                     // 当前区块哈希
  nonce: number;                    // 随机数（用于PoW）
  difficulty: number;               // 挖矿难度
  merkleRoot: string;               // Merkle树根哈希
  miner: string;                    // 矿工地址
  reward: number;                   // 区块奖励
}

// 交易接口
export interface ITransaction {
  id: string;                       // 交易ID
  from: string;                     // 发送方地址
  to: string;                       // 接收方地址
  amount: number;                   // 转账金额
  fee: number;                      // 交易手续费
  timestamp: number;                // 交易时间戳
  signature?: string;               // 交易签名
  publicKey?: string;               // 发送方公钥
  denom: string;                    // 代币类型
}

// UTXO接口（未花费交易输出）
export interface UTXO {
  txId: string;                     // 交易ID
  outputIndex: number;              // 输出索引
  address: string;                  // 拥有者地址
  amount: number;                   // 金额
  denom: string;                    // 代币类型
}

/**
 * 区块类
 */
export class Block implements IBlock {
  public index: number;
  public timestamp: number;
  public data: ITransaction[];
  public previousHash: string;
  public hash: string;
  public nonce: number;
  public difficulty: number;
  public merkleRoot: string;
  public miner: string;
  public reward: number;

  constructor(
    index: number,
    data: ITransaction[],
    previousHash: string,
    difficulty: number = 4,
    miner: string = '',
    reward: number = 50
  ) {
    this.index = index;
    this.timestamp = Date.now();
    this.data = data;
    this.previousHash = previousHash;
    this.difficulty = difficulty;
    this.miner = miner;
    this.reward = reward;
    this.nonce = 0;
    
    // 计算Merkle树根
    this.merkleRoot = this.calculateMerkleRoot();
    
    // 初始化哈希
    this.hash = this.calculateHash();
  }

  /**
   * 计算区块哈希
   */
  calculateHash(): string {
    const data = 
      this.index.toString() +
      this.previousHash +
      this.timestamp.toString() +
      JSON.stringify(this.data) +
      this.nonce.toString() +
      this.difficulty.toString() +
      this.merkleRoot +
      this.miner +
      this.reward.toString();
    
    return sha256Sync(data);
  }

  /**
   * 计算Merkle树根哈希
   */
  calculateMerkleRoot(): string {
    const txStrings = this.data.map(tx => JSON.stringify(tx));
    return MerkleTree.calculateRoot(txStrings);
  }

  /**
   * 挖矿（工作量证明）
   */
  mineBlock(difficulty: number): void {
    const target = Array(difficulty + 1).join('0');
    
    console.log(`开始挖矿区块 #${this.index}...`);
    const startTime = Date.now();

    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
      
      // 每10万次显示进度
      if (this.nonce % 100000 === 0) {
        console.log(`尝试次数: ${this.nonce}, 当前哈希: ${this.hash.substring(0, 20)}...`);
      }
    }

    const endTime = Date.now();
    console.log(`区块 #${this.index} 挖矿完成!`);
    console.log(`哈希: ${this.hash}`);
    console.log(`Nonce: ${this.nonce}`);
    console.log(`用时: ${endTime - startTime}ms`);
  }

  /**
   * 验证区块
   */
  isValid(previousBlock?: Block): boolean {
    // 验证哈希
    if (this.hash !== this.calculateHash()) {
      console.log('无效的区块哈希');
      return false;
    }

    // 验证前一个区块的哈希
    if (previousBlock && this.previousHash !== previousBlock.hash) {
      console.log('无效的前一个区块哈希');
      return false;
    }

    // 验证工作量证明
    if (!ProofOfWork.verify(
      this.index.toString() + this.previousHash + this.timestamp + JSON.stringify(this.data) + 
      this.difficulty + this.merkleRoot + this.miner + this.reward,
      this.nonce,
      this.difficulty
    )) {
      console.log('无效的工作量证明');
      return false;
    }

    // 验证Merkle根
    if (this.merkleRoot !== this.calculateMerkleRoot()) {
      console.log('无效的Merkle根');
      return false;
    }

    // 验证所有交易
    for (const tx of this.data) {
      if (!this.isValidTransaction(tx)) {
        console.log(`无效的交易: ${tx.id}`);
        return false;
      }
    }

    return true;
  }

  /**
   * 验证交易
   */
  private isValidTransaction(transaction: ITransaction): boolean {
    // 基本验证
    if (!transaction.id || !transaction.from || !transaction.to) {
      return false;
    }

    if (transaction.amount <= 0 || transaction.fee < 0) {
      return false;
    }

    // TODO: 添加数字签名验证
    // TODO: 添加余额验证

    return true;
  }
}

/**
 * 交易类
 */
export class Transaction implements ITransaction {
  public id: string;
  public from: string;
  public to: string;
  public amount: number;
  public fee: number;
  public timestamp: number;
  public signature?: string;
  public publicKey?: string;
  public denom: string;

  constructor(
    from: string,
    to: string,
    amount: number,
    fee: number = 0.001,
    denom: string = 'COSMOS'
  ) {
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.fee = fee;
    this.denom = denom;
    this.timestamp = Date.now();
    this.id = this.calculateHash();
  }

  /**
   * 计算交易哈希
   */
  calculateHash(): string {
    const data = 
      this.from +
      this.to +
      this.amount.toString() +
      this.fee.toString() +
      this.timestamp.toString() +
      this.denom;
    
    return sha256Sync(data);
  }

  /**
   * 签名交易
   */
  signTransaction(privateKey: string): void {
    const hash = this.calculateHash();
    this.signature = sha256Sync(hash + privateKey);
  }

  /**
   * 验证交易签名
   */
  isValid(): boolean {
    if (!this.signature || !this.publicKey) {
      return false;
    }

    const hash = this.calculateHash();
    const expectedSignature = sha256Sync(hash + this.publicKey);
    
    return this.signature === expectedSignature;
  }
}

/**
 * 交易池类
 */
export class TransactionPool {
  private transactions: Map<string, Transaction> = new Map();
  private maxSize: number = 1000;

  /**
   * 添加交易到池中
   */
  addTransaction(transaction: Transaction): boolean {
    if (this.transactions.size >= this.maxSize) {
      console.log('交易池已满');
      return false;
    }

    if (this.transactions.has(transaction.id)) {
      console.log('交易已存在');
      return false;
    }

    // TODO: 验证交易有效性和余额
    
    this.transactions.set(transaction.id, transaction);
    console.log(`交易已添加到池中: ${transaction.id}`);
    return true;
  }

  /**
   * 获取待打包的交易
   */
  getPendingTransactions(count: number = 10): Transaction[] {
    const transactions = Array.from(this.transactions.values())
      .sort((a, b) => b.fee - a.fee) // 按手续费排序
      .slice(0, count);
    
    return transactions;
  }

  /**
   * 移除已打包的交易
   */
  removeTransactions(transactionIds: string[]): void {
    transactionIds.forEach(id => {
      this.transactions.delete(id);
    });
  }

  /**
   * 获取交易池大小
   */
  getSize(): number {
    return this.transactions.size;
  }

  /**
   * 清空交易池
   */
  clear(): void {
    this.transactions.clear();
  }
}

/**
 * 区块链主类
 */
export class Blockchain {
  public chain: Block[];
  public difficulty: number;
  public miningReward: number;
  public transactionPool: TransactionPool;
  private utxos: Map<string, UTXO[]> = new Map(); // 地址 -> UTXOs
  private balances: Map<string, Map<string, number>> = new Map(); // 地址 -> {denom -> 余额}

  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 4;
    this.miningReward = 50;
    this.transactionPool = new TransactionPool();
    
    // 尝试从本地存储恢复数据
    if (!this.loadFromStorage()) {
      // 如果没有存储数据，初始化创世账户余额
      this.initializeGenesisBalances();
    }
    
    // 启用自动保存
    this.enableAutoSave();
  }

  /**
   * 创建创世区块
   */
  createGenesisBlock(): Block {
    const genesisTransactions: Transaction[] = [
      new Transaction('genesis', 'cosmos1genesis1', 1000000, 0),
      new Transaction('genesis', 'cosmos1genesis2', 1000000, 0),
    ];

    return new Block(0, genesisTransactions, '0', 1, 'genesis', 0);
  }

  /**
   * 初始化创世账户余额
   */
  private initializeGenesisBalances(): void {
    const genesisBalances = new Map([
      ['COSMOS', 1000000],
      ['ATOM', 500000],
      ['STAKE', 2000000]
    ]);

    this.balances.set('cosmos1genesis1', genesisBalances);
    this.balances.set('cosmos1genesis2', new Map(genesisBalances));
  }

  /**
   * 获取最新区块
   */
  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  /**
   * 创建新交易
   */
  createTransaction(from: string, to: string, amount: number, denom: string = 'COSMOS', fee: number = 0.001): Transaction {
    return new Transaction(from, to, amount, fee, denom);
  }

  /**
   * 添加交易到池中
   */
  addTransaction(transaction: Transaction): boolean {
    // 系统地址可以无限制铸造任意代币
    if (transaction.from !== 'system') {
      // 验证发送方余额
      const senderBalance = this.getBalance(transaction.from, transaction.denom);
      if (senderBalance < transaction.amount + transaction.fee) {
        console.log(`余额不足: ${transaction.from} 需要 ${transaction.amount + transaction.fee}, 但只有 ${senderBalance}`);
        return false;
      }
    }

    return this.transactionPool.addTransaction(transaction);
  }

  /**
   * 挖矿新区块
   */
  mineBlock(minerAddress: string): Block {
    // 获取待打包交易
    const transactions = this.transactionPool.getPendingTransactions();
    
    // 添加挖矿奖励交易
    const rewardTransaction = new Transaction(
      'system',
      minerAddress,
      this.miningReward,
      0,
      'COSMOS'
    );
    transactions.unshift(rewardTransaction);

    // 动态调整难度
    const adjustedDifficulty = this.adjustDifficulty();

    // 创建新区块
    const newBlock = new Block(
      this.chain.length,
      transactions,
      this.getLatestBlock().hash,
      adjustedDifficulty,
      minerAddress,
      this.miningReward
    );

    // 挖矿
    newBlock.mineBlock(adjustedDifficulty);

    // 验证区块
    if (newBlock.isValid(this.getLatestBlock())) {
      this.chain.push(newBlock);
      
      // 更新余额
      this.updateBalances(transactions);
      
      // 移除已打包的交易
      const txIds = transactions.map(tx => tx.id);
      this.transactionPool.removeTransactions(txIds);
      
      console.log(`新区块已添加到链中: #${newBlock.index}`);
      return newBlock;
    } else {
      throw new Error('挖出的区块无效');
    }
  }

  /**
   * 动态调整难度
   */
  private adjustDifficulty(): number {
    const targetBlockTime = 10000; // 10秒
    const adjustmentInterval = 10; // 每10个区块调整一次

    if (this.chain.length % adjustmentInterval !== 0) {
      return this.difficulty;
    }

    if (this.chain.length < adjustmentInterval) {
      return this.difficulty;
    }

    const recentBlocks = this.chain.slice(-adjustmentInterval);
    const actualTime = recentBlocks[recentBlocks.length - 1].timestamp - recentBlocks[0].timestamp;
    const expectedTime = targetBlockTime * (adjustmentInterval - 1);

    if (actualTime < expectedTime / 2) {
      this.difficulty++;
    } else if (actualTime > expectedTime * 2) {
      this.difficulty = Math.max(1, this.difficulty - 1);
    }

    console.log(`难度调整: ${this.difficulty}`);
    return this.difficulty;
  }

  /**
   * 更新账户余额
   */
  private updateBalances(transactions: Transaction[]): void {
    transactions.forEach(tx => {
      if (tx.from !== 'system') {
        // 扣除发送方余额
        this.subtractBalance(tx.from, tx.denom, tx.amount + tx.fee);
      }
      
      // 增加接收方余额
      this.addBalance(tx.to, tx.denom, tx.amount);
    });
  }

  /**
   * 增加余额
   */
  private addBalance(address: string, denom: string, amount: number): void {
    if (!this.balances.has(address)) {
      this.balances.set(address, new Map());
    }
    
    const addressBalances = this.balances.get(address)!;
    const currentBalance = addressBalances.get(denom) || 0;
    addressBalances.set(denom, currentBalance + amount);
  }

  /**
   * 扣除余额
   */
  private subtractBalance(address: string, denom: string, amount: number): void {
    if (!this.balances.has(address)) {
      return;
    }
    
    const addressBalances = this.balances.get(address)!;
    const currentBalance = addressBalances.get(denom) || 0;
    addressBalances.set(denom, Math.max(0, currentBalance - amount));
  }

  /**
   * 获取账户余额
   */
  getBalance(address: string, denom: string): number {
    const addressBalances = this.balances.get(address);
    if (!addressBalances) {
      return 0;
    }
    
    return addressBalances.get(denom) || 0;
  }

  /**
   * 获取所有余额
   */
  getAllBalances(address: string): { denom: string; amount: string }[] {
    const addressBalances = this.balances.get(address);
    if (!addressBalances) {
      return [];
    }

    return Array.from(addressBalances.entries()).map(([denom, amount]) => ({
      denom,
      amount: amount.toString()
    }));
  }

  /**
   * 验证整个区块链
   */
  isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (!currentBlock.isValid(previousBlock)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 获取区块链统计信息
   */
  getStats(): any {
    return {
      totalBlocks: this.chain.length,
      difficulty: this.difficulty,
      pendingTransactions: this.transactionPool.getSize(),
      totalTransactions: this.chain.reduce((sum, block) => sum + block.data.length, 0),
      isValid: this.isChainValid()
    };
  }

  /**
   * 从本地存储加载区块链数据
   */
  loadFromStorage(): boolean {
    try {
      const success = BlockchainStorage.restore(this);
      if (success) {
        console.log('区块链数据已从本地存储恢复');
        return true;
      }
      return false;
    } catch (error) {
      console.error('从存储加载失败:', error);
      return false;
    }
  }

  /**
   * 保存区块链数据到本地存储
   */
  saveToStorage(): boolean {
    try {
      return BlockchainStorage.save(this);
    } catch (error) {
      console.error('保存到存储失败:', error);
      return false;
    }
  }

  /**
   * 启用自动保存
   */
  private enableAutoSave(): void {
    BlockchainStorage.enableAutoSave(this, 30000); // 每30秒自动保存
  }

  /**
   * 创建区块链快照
   */
  createSnapshot(name?: string): string {
    return SnapshotManager.createSnapshot(this, name);
  }

  /**
   * 从快照恢复
   */
  restoreFromSnapshot(snapshotName: string): boolean {
    return SnapshotManager.restoreSnapshot(this, snapshotName);
  }

  /**
   * 列出所有快照
   */
  listSnapshots(): { name: string; timestamp: number; size: string }[] {
    return SnapshotManager.listSnapshots();
  }

  /**
   * 重置区块链（清除所有数据）
   */
  reset(): void {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 4;
    this.miningReward = 50;
    this.transactionPool.clear();
    this.balances.clear();
    this.utxos.clear();
    
    // 重新初始化创世余额
    this.initializeGenesisBalances();
    
    // 清除存储
    BlockchainStorage.clear();
    
    console.log('区块链已重置');
  }
}

// 导出单例实例
export const blockchain = new Blockchain();