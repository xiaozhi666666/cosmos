/**
 * Cosmos 区块链服务类
 * 
 * 提供与Cosmos区块链交互的核心功能，包括：
 * - 钱包创建和导入
 * - 代币转账
 * - 余额查询
 * - 区块和验证者信息获取
 * - 挖矿模拟
 * 
 * 本服务支持两种模式：
 * 1. 本地模拟模式：使用mockBlockchain进行离线模拟
 * 2. 网络模式：连接真实的Cosmos网络（当前已禁用）
 */

import { StargateClient, SigningStargateClient } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { GasPrice } from '@cosmjs/stargate';

/**
 * 钱包信息接口
 * 用于钱包创建和导入操作的返回值
 */
export interface WalletInfo {
  address: string;        // 钱包地址
  mnemonic: string;       // 助记词
  publicKey: Uint8Array;  // 公钥
}

/**
 * 代币信息接口
 * 用于余额查询的返回值
 */
export interface TokenInfo {
  denom: string;   // 代币名称
  amount: string;  // 代币数量
}

/**
 * 区块信息接口
 * 用于区块查询的返回值
 */
export interface BlockInfo {
  height: number;  // 区块高度
  hash: string;    // 区块哈希
  time: string;    // 创建时间
  txCount: number; // 交易数量
}

/**
 * 交易信息接口
 * 用于交易相关操作的数据结构
 */
export interface TransactionInfo {
  hash: string;    // 交易哈希
  height: number;  // 区块高度
  from: string;    // 发送方
  to: string;      // 接收方
  amount: string;  // 金额
  fee: string;     // 手续费
  status: string;  // 状态
}

/**
 * Cosmos服务主类
 * 管理与区块链的所有交互操作
 */
export class CosmosService {
  // 只读客户端，用于查询操作
  private client: StargateClient | null = null;
  // 签名客户端，用于发送交易
  private signingClient: SigningStargateClient | null = null;
  // HD钱包实例
  private wallet: DirectSecp256k1HdWallet | null = null;
  // 是否使用本地模拟链（默认为true）
  private useLocalChain: boolean = true;

  /**
   * 构造函数
   * 初始化服务并启动本地模拟区块链
   */
  constructor() {
    // 启动本地区块链
    if (this.useLocalChain) {
      // 延迟导入以避免循环依赖
      import('./mockBlockchain').then(({ mockBlockchain }) => {
        mockBlockchain.startBlockGeneration();
        console.log('本地模拟区块链已启动');
      });
    }
  }

  /**
   * 连接到区块链网络
   * 在本地模式下此方法不执行实际连接
   */
  async connect(): Promise<void> {
    if (this.useLocalChain) {
      console.log('使用本地模拟区块链，无需连接外部网络');
      return;
    }
    
    // 在本地模式下不需要网络连接
    console.log('本地模拟模式已启用，跳过网络连接');
  }

  /**
   * 创建新钱包
   * 生成随机的24个单词助记词和对应的钱包地址
   * 
   * @returns Promise<WalletInfo> 钱包信息，包含地址、助记词和公钥
   * @throws Error 当钱包创建失败时抛出异常
   */
  async createWallet(): Promise<WalletInfo> {
    try {
      // 生成包含24个助记词的HD钱包
      const wallet = await DirectSecp256k1HdWallet.generate(24);
      const accounts = await wallet.getAccounts();
      
      // 验证账户是否成功创建
      if (!accounts || accounts.length === 0) {
        throw new Error('Failed to generate wallet accounts');
      }
      
      const [account] = accounts;
      
      // 验证账户地址是否有效
      if (!account || !account.address) {
        throw new Error('Failed to get wallet address from account');
      }
      
      return {
        address: account.address,
        mnemonic: wallet.mnemonic,
        publicKey: account.pubkey
      };
    } catch (error) {
      console.error('Failed to create wallet:', error);
      throw error;
    }
  }

  /**
   * 导入现有钱包
   * 使用助记词恢复钱包
   * 
   * @param mnemonic - 12或24个单词的助记词字符串
   * @returns Promise<WalletInfo> 导入的钱包信息
   * @throws Error 当助记词无效或导入失败时抛出异常
   */
  async importWallet(mnemonic: string): Promise<WalletInfo> {
    try {
      // 从助记词创建HD钱包
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
      const accounts = await wallet.getAccounts();
      
      // 验证账户是否成功导入
      if (!accounts || accounts.length === 0) {
        throw new Error('Failed to import wallet accounts');
      }
      
      const [account] = accounts;
      
      // 验证账户地址是否有效
      if (!account || !account.address) {
        throw new Error('Failed to get wallet address from imported account');
      }
      
      // 保存钱包实例供后续使用
      this.wallet = wallet;
      
      return {
        address: account.address,
        mnemonic: mnemonic,
        publicKey: account.pubkey
      };
    } catch (error) {
      console.error('Failed to import wallet:', error);
      throw error;
    }
  }

  async getSigningClient(mnemonic: string): Promise<SigningStargateClient> {
    try {
      if (this.useLocalChain) {
        // 在本地模式下，不需要真实的 signing client
        throw new Error('本地模式不支持真实的签名客户端');
      }

      if (!this.wallet) {
        this.wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
      }
      
      // 这里需要网络连接，但在本地模式下不会执行到
      throw new Error('网络模式已禁用');
    } catch (error) {
      console.error('Failed to get signing client:', error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<TokenInfo[]> {
    try {
      if (this.useLocalChain) {
        const { mockBlockchain } = await import('./mockBlockchain');
        const balance = mockBlockchain.getAccountBalance(address);
        return balance.map((coin: any) => ({
          denom: coin.denom,
          amount: coin.amount
        }));
      }

      if (!this.client) {
        await this.connect();
      }
      
      const balance = await this.client!.getAllBalances(address);
      return balance.map(coin => ({
        denom: coin.denom,
        amount: coin.amount
      }));
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  async sendTokens(
    mnemonic: string,
    fromAddress: string,
    toAddress: string,
    amount: string,
    denom: string = 'stake'
  ): Promise<string> {
    try {
      if (this.useLocalChain) {
        // 模拟转账交易
        const { mockBlockchain } = await import('./mockBlockchain');
        const txHash = mockBlockchain.addTransaction({
          from: fromAddress,
          to: toAddress,
          amount,
          denom,
          fee: '0.001'
        });
        
        console.log(`本地转账已提交: ${txHash}`);
        return txHash;
      }

      const signingClient = await this.getSigningClient(mnemonic);
      
      const fee = {
        amount: [{ denom: 'uatom', amount: '5000' }],
        gas: '200000',
      };

      const result = await signingClient.sendTokens(
        fromAddress,
        toAddress,
        [{ denom, amount }],
        fee,
        'Token transfer'
      );

      return result.transactionHash;
    } catch (error) {
      console.error('Failed to send tokens:', error);
      throw error;
    }
  }

  async getLatestBlock(): Promise<BlockInfo> {
    try {
      if (this.useLocalChain) {
        const { mockBlockchain } = await import('./mockBlockchain');
        const block = mockBlockchain.getLatestBlock();
        return {
          height: block.height,
          hash: block.hash,
          time: block.timestamp,
          txCount: block.transactions.length
        };
      }

      if (!this.client) {
        await this.connect();
      }

      const latestBlock = await this.client!.getBlock();
      
      return {
        height: latestBlock.header.height,
        hash: latestBlock.id,
        time: new Date(latestBlock.header.time).toISOString(),
        txCount: latestBlock.txs.length
      };
    } catch (error) {
      console.error('Failed to get latest block:', error);
      throw error;
    }
  }

  async getBlockByHeight(height: number): Promise<BlockInfo> {
    try {
      if (this.useLocalChain) {
        const { mockBlockchain } = await import('./mockBlockchain');
        const block = mockBlockchain.getBlockByHeight(height);
        if (!block) {
          throw new Error(`区块 #${height} 未找到`);
        }
        return {
          height: block.height,
          hash: block.hash,
          time: block.timestamp,
          txCount: block.transactions.length
        };
      }

      if (!this.client) {
        await this.connect();
      }

      const block = await this.client!.getBlock(height);
      
      return {
        height: block.header.height,
        hash: block.id,
        time: new Date(block.header.time).toISOString(),
        txCount: block.txs.length
      };
    } catch (error) {
      console.error('Failed to get block by height:', error);
      throw error;
    }
  }

  async getChainId(): Promise<string> {
    try {
      if (this.useLocalChain) {
        const { mockBlockchain } = await import('./mockBlockchain');
        return mockBlockchain.getChainInfo().chainId;
      }

      if (!this.client) {
        await this.connect();
      }
      
      return await this.client!.getChainId();
    } catch (error) {
      console.error('Failed to get chain ID:', error);
      throw error;
    }
  }

  async getValidators(): Promise<any[]> {
    try {
      if (this.useLocalChain) {
        const { mockBlockchain } = await import('./mockBlockchain');
        return mockBlockchain.getValidators();
      }

      // 网络模式已禁用
      throw new Error('网络模式已禁用');
    } catch (error) {
      console.error('获取验证者失败:', error);
      throw error;
    }
  }

  async simulateMining(validatorAddress: string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        if (this.useLocalChain) {
          const { mockBlockchain } = await import('./mockBlockchain');
          const reward = mockBlockchain.simulateMining(validatorAddress);
          resolve(reward.toFixed(6));
        } else {
          const reward = (Math.random() * 10 + 1).toFixed(6);
          resolve(reward);
        }
      }, 2000);
    });
  }
}

export const cosmosService = new CosmosService();