/**
 * Cosmos 区块链应用的类型定义文件
 * 
 * 包含应用中使用的所有主要数据结构和接口定义
 * 这些类型确保了代码的类型安全和数据结构的一致性
 */

/**
 * 钱包接口
 * 定义钱包的基本结构和属性
 */
export interface Wallet {
  address: string;           // 钱包地址，唯一标识符
  mnemonic: string;          // 助记词，用于钱包恢复
  balance: TokenBalance[];   // 钱包中持有的代币余额列表
}

/**
 * 代币余额接口
 * 定义代币的名称和数量
 */
export interface TokenBalance {
  denom: string;   // 代币名称/符号 (denomination)
  amount: string;  // 代币数量，使用字符串避免精度问题
}

/**
 * 区块接口
 * 定义区块链中区块的基本信息
 */
export interface Block {
  height: number;      // 区块高度（区块号）
  hash: string;        // 区块哈希值，区块的唯一标识
  time: string;        // 区块创建时间
  txCount: number;     // 区块中包含的交易数量
  proposer?: string;   // 区块提议者（可选），通常是验证者地址
}

/**
 * 交易接口
 * 定义区块链交易的详细信息
 */
export interface Transaction {
  hash: string;                               // 交易哈希值，交易的唯一标识
  height: number;                             // 交易所在区块的高度
  from: string;                               // 发送方地址
  to: string;                                 // 接收方地址
  amount: string;                             // 转账金额
  denom: string;                              // 转账代币类型
  fee: string;                                // 交易手续费
  status: 'success' | 'failed' | 'pending';  // 交易状态
  timestamp: string;                          // 交易时间戳
}

/**
 * 验证者接口
 * 定义区块链网络中验证者（节点）的信息
 */
export interface Validator {
  address: string;     // 验证者地址
  moniker: string;     // 验证者名称/标识
  votingPower: string; // 投票权重（质押的代币数量）
  commission: string;  // 验证者佣金比例
  status: string;      // 验证者状态（active, inactive等）
}

/**
 * 挖矿奖励接口
 * 定义挖矿获得的奖励信息
 */
export interface MiningReward {
  amount: string;      // 奖励金额
  denom: string;       // 奖励代币类型
  blockHeight: number; // 获得奖励的区块高度
  timestamp: string;   // 奖励时间戳
}