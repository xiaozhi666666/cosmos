/**
 * 模拟区块链服务
 * 
 * 这个文件实现了一个完整的模拟区块链系统，用于离线演示和测试
 * 主要功能包括：
 * - 模拟区块生成和管理
 * - 模拟交易处理
 * - 验证者管理
 * - 账户余额管理
 * - 挖矿奖励模拟
 * 
 * 这个模拟系统可以在没有网络连接的情况下提供完整的区块链体验
 */

/**
 * 模拟区块接口
 * 定义区块链中每个区块的数据结构
 */
export interface MockBlock {
  height: number;                    // 区块高度（区块号）
  hash: string;                      // 区块哈希值
  timestamp: string;                 // 区块创建时间戳
  transactions: MockTransaction[];   // 区块中包含的交易列表
  validator: string;                 // 产生此区块的验证者
  difficulty: number;                // 挖矿难度
}

/**
 * 模拟交易接口
 * 定义区块链中每笔交易的数据结构
 */
export interface MockTransaction {
  hash: string;                      // 交易哈希值
  from: string;                      // 发送方地址
  to: string;                        // 接收方地址
  amount: string;                    // 转账金额
  denom: string;                     // 代币类型
  fee: string;                       // 交易手续费
  timestamp: string;                 // 交易时间戳
  status: 'success' | 'failed';     // 交易状态
  blockHeight: number;               // 交易所在区块高度
}

export interface MockValidator {
  address: string;
  name: string;
  votingPower: string;
  commission: string;
  status: 'active' | 'inactive';
}

export interface MockChainInfo {
  chainId: string;
  name: string;
  version: string;
  totalSupply: string;
  stakingDenom: string;
}

export class MockBlockchainService {
  private blocks: MockBlock[] = [];
  private transactions: MockTransaction[] = [];
  private validators: MockValidator[] = [];
  private chainInfo: MockChainInfo;
  private isRunning: boolean = false;
  private blockGenerationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.chainInfo = {
      chainId: 'cosmos-local-1',
      name: 'Cosmos Local Chain',
      version: '1.0.0',
      totalSupply: '1000000000000',
      stakingDenom: 'stake'
    };

    this.initializeValidators();
    this.initializeGenesis();
  }

  private initializeGenesis() {
    // 创建创世区块
    const genesisBlock: MockBlock = {
      height: 1,
      hash: this.generateHash('genesis'),
      timestamp: new Date('2024-01-01T00:00:00Z').toISOString(),
      transactions: [],
      validator: 'genesis',
      difficulty: 1
    };

    this.blocks.push(genesisBlock);

    // 生成一些初始区块
    for (let i = 2; i <= 100; i++) {
      const block = this.generateBlock(i);
      this.blocks.push(block);
    }
  }

  private initializeValidators() {
    this.validators = [
      {
        address: 'cosmosvaloper1validator1',
        name: '本地验证者1',
        votingPower: '1000000',
        commission: '0.05',
        status: 'active'
      },
      {
        address: 'cosmosvaloper1validator2',
        name: '本地验证者2',
        votingPower: '800000',
        commission: '0.07',
        status: 'active'
      },
      {
        address: 'cosmosvaloper1validator3',
        name: '本地验证者3',
        votingPower: '600000',
        commission: '0.10',
        status: 'active'
      },
      {
        address: 'cosmosvaloper1validator4',
        name: '本地验证者4',
        votingPower: '400000',
        commission: '0.08',
        status: 'active'
      },
      {
        address: 'cosmosvaloper1validator5',
        name: '本地验证者5',
        votingPower: '200000',
        commission: '0.12',
        status: 'inactive'
      }
    ];
  }

  private generateHash(input: string): string {
    // 简单的哈希生成函数
    let hash = 0;
    const str = input + Date.now().toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(64, '0');
  }

  private generateBlock(height: number): MockBlock {
    const prevBlock = this.blocks[this.blocks.length - 1];
    const validator = this.validators.length > 0 
      ? this.validators[Math.floor(Math.random() * this.validators.length)]
      : { address: 'genesis-validator' };
    
    // 生成随机交易
    const txCount = Math.floor(Math.random() * 10) + 1;
    const transactions: MockTransaction[] = [];
    
    for (let i = 0; i < txCount; i++) {
      const tx = this.generateRandomTransaction(height);
      transactions.push(tx);
      this.transactions.push(tx);
    }

    const block: MockBlock = {
      height,
      hash: this.generateHash(`block-${height}-${prevBlock.hash}`),
      timestamp: new Date(Date.now() - (100 - height) * 6000).toISOString(), // 每6秒一个区块
      transactions,
      validator: validator.address,
      difficulty: Math.floor(Math.random() * 1000000) + 1000000
    };

    return block;
  }

  private generateRandomTransaction(blockHeight: number): MockTransaction {
    const addresses = [
      'cosmos1sender1address',
      'cosmos1sender2address', 
      'cosmos1receiver1address',
      'cosmos1receiver2address',
      'cosmos1user1address',
      'cosmos1user2address'
    ];

    const denoms = ['stake', 'atom', 'usdc', 'osmo'];
    const from = addresses[Math.floor(Math.random() * addresses.length)];
    const to = addresses[Math.floor(Math.random() * addresses.length)];
    const denom = denoms[Math.floor(Math.random() * denoms.length)];
    
    return {
      hash: this.generateHash(`tx-${blockHeight}-${Math.random()}`),
      from,
      to,
      amount: (Math.random() * 1000 + 1).toFixed(6),
      denom,
      fee: (Math.random() * 0.01 + 0.001).toFixed(6),
      timestamp: new Date().toISOString(),
      status: Math.random() > 0.1 ? 'success' : 'failed',
      blockHeight
    };
  }

  // 公共方法
  startBlockGeneration() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.blockGenerationInterval = setInterval(() => {
      const latestBlock = this.blocks[this.blocks.length - 1];
      const newBlock = this.generateBlock(latestBlock.height + 1);
      this.blocks.push(newBlock);
      
      // 只保留最近1000个区块
      if (this.blocks.length > 1000) {
        this.blocks.shift();
      }
      
      console.log(`新区块已生成: #${newBlock.height}`);
    }, 6000); // 每6秒生成一个新区块
  }

  stopBlockGeneration() {
    if (this.blockGenerationInterval) {
      clearInterval(this.blockGenerationInterval);
      this.blockGenerationInterval = null;
    }
    this.isRunning = false;
  }

  getLatestBlock(): MockBlock {
    return this.blocks[this.blocks.length - 1];
  }

  getBlockByHeight(height: number): MockBlock | null {
    return this.blocks.find(block => block.height === height) || null;
  }

  getBlocks(limit: number = 10): MockBlock[] {
    return this.blocks.slice(-limit).reverse();
  }

  getTransactionsByBlock(height: number): MockTransaction[] {
    return this.transactions.filter(tx => tx.blockHeight === height);
  }

  getTransactionByHash(hash: string): MockTransaction | null {
    return this.transactions.find(tx => tx.hash === hash) || null;
  }

  getValidators(): MockValidator[] {
    return this.validators;
  }

  getChainInfo(): MockChainInfo {
    return this.chainInfo;
  }

  // 添加新交易到内存池
  addTransaction(transaction: Omit<MockTransaction, 'hash' | 'timestamp' | 'blockHeight' | 'status'>): string {
    const tx: MockTransaction = {
      ...transaction,
      hash: this.generateHash(`tx-${Date.now()}-${Math.random()}`),
      timestamp: new Date().toISOString(),
      blockHeight: 0, // 将在下个区块中包含
      status: 'success'
    };

    // 模拟添加到下个区块
    setTimeout(() => {
      const latestBlock = this.getLatestBlock();
      tx.blockHeight = latestBlock.height + 1;
      this.transactions.push(tx);
    }, Math.random() * 6000); // 随机延迟，模拟区块确认时间

    return tx.hash;
  }

  // 模拟挖矿奖励
  simulateMining(validatorAddress: string): number {
    const validator = this.validators.find(v => v.address === validatorAddress);
    if (!validator || validator.status !== 'active') {
      return 0;
    }

    // 基于投票权重计算奖励
    const baseReward = 10;
    const votingPowerMultiplier = parseInt(validator.votingPower) / 1000000;
    const randomFactor = Math.random() * 0.5 + 0.75; // 0.75-1.25倍随机因子
    
    return baseReward * votingPowerMultiplier * randomFactor;
  }

  // 获取账户余额（模拟）
  getAccountBalance(address: string): { denom: string; amount: string }[] {
    // 为不同地址返回不同的模拟余额
    const hash = this.generateHash(address);
    const baseAmount = parseInt(hash.slice(0, 8), 16) % 10000000; // 0-10M
    
    return [
      { denom: 'stake', amount: (baseAmount + 1000000).toString() },
      { denom: 'atom', amount: (baseAmount / 10).toFixed(0) },
      { denom: 'usdc', amount: (baseAmount / 100).toFixed(0) }
    ];
  }

  // 重置区块链状态
  reset() {
    this.stopBlockGeneration();
    this.blocks = [];
    this.transactions = [];
    this.initializeGenesis();
    console.log('本地区块链已重置');
  }
}

// 导出单例实例
export const mockBlockchain = new MockBlockchainService();