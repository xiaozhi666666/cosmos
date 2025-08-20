/**
 * 本地区块链与Cosmos服务集成层
 * 
 * 这个服务负责协调本地区块链和Cosmos网络之间的数据同步和一致性
 * 
 * 主要功能：
 * - 数据同步：在本地链和Cosmos网络间同步余额和交易
 * - 状态管理：维护统一的账户状态
 * - 交易路由：根据交易类型选择适当的处理方式
 * - 错误处理：统一的错误处理和重试机制
 */

import { getBlockchain, Transaction } from './blockchain';
import { cosmosService, WalletInfo, TokenInfo } from './cosmos';
import { rpcService } from './rpc';

// 集成服务配置
interface IntegrationConfig {
  syncInterval: number;           // 同步间隔（毫秒）
  enableAutoSync: boolean;        // 是否启用自动同步
  preferLocalChain: boolean;      // 优先使用本地链
  fallbackToCosmos: boolean;      // 当本地链出错时回退到Cosmos
  maxRetries: number;             // 最大重试次数
}

// 账户状态接口
interface AccountState {
  address: string;
  localBalances: { denom: string; amount: string }[];
  cosmosBalances: { denom: string; amount: string }[];
  lastSyncTime: number;
  syncStatus: 'synced' | 'syncing' | 'error';
  pendingTransactions: string[];
}

// 同步结果接口
interface SyncResult {
  success: boolean;
  syncedAccounts: number;
  errors: string[];
  duration: number;
}

/**
 * 区块链集成服务类
 */
export class IntegrationService {
  private config: IntegrationConfig;
  private accountStates = new Map<string, AccountState>();
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config: Partial<IntegrationConfig> = {}) {
    this.config = {
      syncInterval: 30000,        // 30秒
      enableAutoSync: true,
      preferLocalChain: true,
      fallbackToCosmos: true,
      maxRetries: 3,
      ...config
    };

    console.log('区块链集成服务已初始化', this.config);
  }

  /**
   * 初始化集成服务
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('集成服务已初始化');
      return;
    }

    try {
      // 初始化Cosmos服务
      await cosmosService.connect();
      
      // 加载已知账户
      await this.loadKnownAccounts();
      
      // 启动自动同步
      if (this.config.enableAutoSync) {
        this.startAutoSync();
      }

      this.isInitialized = true;
      console.log('集成服务初始化完成');
    } catch (error) {
      console.error('集成服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 销毁集成服务
   */
  destroy(): void {
    this.stopAutoSync();
    this.accountStates.clear();
    this.isInitialized = false;
    console.log('集成服务已销毁');
  }

  /**
   * 获取统一的账户余额
   */
  async getUnifiedBalance(address: string): Promise<TokenInfo[]> {
    await this.ensureInitialized();

    try {
      // 优先从本地链获取
      if (this.config.preferLocalChain) {
        const localBalances = getBlockchain().getAllBalances(address);
        if (localBalances.length > 0) {
          return localBalances;
        }
      }

      // 回退到Cosmos网络
      if (this.config.fallbackToCosmos) {
        try {
          return await cosmosService.getBalance(address);
        } catch (cosmosError) {
          console.warn('Cosmos余额查询失败，使用本地余额:', cosmosError);
          return getBlockchain().getAllBalances(address);
        }
      }

      return getBlockchain().getAllBalances(address);
    } catch (error) {
      console.error('获取统一余额失败:', error);
      throw error;
    }
  }

  /**
   * 发送统一交易
   */
  async sendUnifiedTransaction(
    from: string,
    to: string,
    amount: string,
    denom: string = 'COSMOS',
    mnemonic?: string,
    preferCosmos?: boolean
  ): Promise<{ txHash: string; source: 'local' | 'cosmos' }> {
    await this.ensureInitialized();

    // 决定使用哪个网络
    const useCosmos = preferCosmos || 
      (denom === 'uatom') || 
      (!this.config.preferLocalChain);

    try {
      if (useCosmos && mnemonic) {
        // 使用Cosmos网络发送交易
        const txHash = await cosmosService.sendTokens(
          mnemonic,
          from,
          to,
          amount,
          denom
        );

        // 同步到本地链（可选）
        this.syncTransactionToLocal(from, to, amount, denom, txHash);

        return { txHash, source: 'cosmos' };
      } else {
        // 使用本地链发送交易
        const transaction = getBlockchain().createTransaction(
          from,
          to,
          parseFloat(amount),
          denom
        );

        const success = getBlockchain().addTransaction(transaction);
        if (!success) {
          throw new Error('本地交易被拒绝');
        }

        return { txHash: transaction.id, source: 'local' };
      }
    } catch (error) {
      console.error('发送统一交易失败:', error);
      throw error;
    }
  }

  /**
   * 同步账户状态
   */
  async syncAccount(address: string): Promise<void> {
    console.log(`开始同步账户: ${address}`);

    const state = this.getOrCreateAccountState(address);
    state.syncStatus = 'syncing';

    try {
      // 获取本地余额
      const localBalances = getBlockchain().getAllBalances(address);
      
      // 获取Cosmos余额
      let cosmosBalances: TokenInfo[] = [];
      try {
        cosmosBalances = await cosmosService.getBalance(address);
      } catch (error) {
        console.warn(`获取Cosmos余额失败 (${address}):`, error);
      }

      // 更新状态
      state.localBalances = localBalances;
      state.cosmosBalances = cosmosBalances;
      state.lastSyncTime = Date.now();
      state.syncStatus = 'synced';

      console.log(`账户同步完成: ${address}`);
    } catch (error) {
      console.error(`账户同步失败 (${address}):`, error);
      state.syncStatus = 'error';
      throw error;
    }
  }

  /**
   * 同步所有已知账户
   */
  async syncAllAccounts(): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let syncedCount = 0;

    console.log(`开始同步 ${this.accountStates.size} 个账户`);

    for (const address of Array.from(this.accountStates.keys())) {
      try {
        await this.syncAccount(address);
        syncedCount++;
      } catch (error: any) {
        errors.push(`${address}: ${error.message}`);
      }
    }

    const duration = Date.now() - startTime;
    const result: SyncResult = {
      success: errors.length === 0,
      syncedAccounts: syncedCount,
      errors,
      duration
    };

    console.log(`账户同步完成:`, result);
    return result;
  }

  /**
   * 注册账户到集成服务
   */
  registerAccount(address: string): void {
    if (!this.accountStates.has(address)) {
      this.accountStates.set(address, {
        address,
        localBalances: [],
        cosmosBalances: [],
        lastSyncTime: 0,
        syncStatus: 'synced',
        pendingTransactions: []
      });

      console.log(`账户已注册: ${address}`);
    }
  }

  /**
   * 获取账户状态
   */
  getAccountState(address: string): AccountState | null {
    return this.accountStates.get(address) || null;
  }

  /**
   * 获取所有账户状态
   */
  getAllAccountStates(): AccountState[] {
    return Array.from(this.accountStates.values());
  }

  /**
   * 创建统一钱包
   */
  async createUnifiedWallet(): Promise<WalletInfo> {
    await this.ensureInitialized();

    try {
      const wallet = await cosmosService.createWallet();
      
      // 注册到集成服务
      this.registerAccount(wallet.address);
      
      // 保存到本地存储
      this.saveWalletToLocal(wallet);

      console.log(`统一钱包已创建: ${wallet.address}`);
      return wallet;
    } catch (error) {
      console.error('创建统一钱包失败:', error);
      throw error;
    }
  }

  /**
   * 导入统一钱包
   */
  async importUnifiedWallet(mnemonic: string): Promise<WalletInfo> {
    await this.ensureInitialized();

    try {
      const wallet = await cosmosService.importWallet(mnemonic);
      
      // 注册到集成服务
      this.registerAccount(wallet.address);
      
      // 保存到本地存储
      this.saveWalletToLocal(wallet);

      console.log(`统一钱包已导入: ${wallet.address}`);
      return wallet;
    } catch (error) {
      console.error('导入统一钱包失败:', error);
      throw error;
    }
  }

  /**
   * 启动挖矿（本地链）
   */
  async startUnifiedMining(minerAddress: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await rpcService.call('startMining', { minerAddress });
      console.log(`统一挖矿已启动: ${minerAddress}`);
    } catch (error) {
      console.error('启动统一挖矿失败:', error);
      throw error;
    }
  }

  /**
   * 停止挖矿
   */
  async stopUnifiedMining(): Promise<void> {
    try {
      await rpcService.call('stopMining');
      console.log('统一挖矿已停止');
    } catch (error) {
      console.error('停止统一挖矿失败:', error);
      throw error;
    }
  }

  /**
   * 获取统一链信息
   */
  async getUnifiedChainInfo(): Promise<any> {
    await this.ensureInitialized();

    const localInfo = await rpcService.call('getChainInfo');
    
    let cosmosInfo: any = {};
    try {
      cosmosInfo = {
        chainId: await cosmosService.getChainId(),
        network: cosmosService.getCurrentNetwork()
      };
    } catch (error) {
      console.warn('获取Cosmos链信息失败:', error);
    }

    return {
      local: localInfo,
      cosmos: cosmosInfo,
      integration: {
        accountCount: this.accountStates.size,
        lastSyncTime: Math.max(...Array.from(this.accountStates.values()).map(s => s.lastSyncTime)),
        syncStatus: this.getSyncStatus()
      }
    };
  }

  /**
   * 私有方法：确保服务已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * 私有方法：获取或创建账户状态
   */
  private getOrCreateAccountState(address: string): AccountState {
    if (!this.accountStates.has(address)) {
      this.registerAccount(address);
    }
    return this.accountStates.get(address)!;
  }

  /**
   * 私有方法：启动自动同步
   */
  private startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        await this.syncAllAccounts();
      } catch (error) {
        console.error('自动同步失败:', error);
      }
    }, this.config.syncInterval);

    console.log(`自动同步已启动，间隔: ${this.config.syncInterval / 1000}s`);
  }

  /**
   * 私有方法：停止自动同步
   */
  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('自动同步已停止');
    }
  }

  /**
   * 私有方法：加载已知账户
   */
  private async loadKnownAccounts(): Promise<void> {
    try {
      const stored = localStorage.getItem('cosmos-wallets');
      if (stored) {
        const wallets = JSON.parse(stored);
        wallets.forEach((wallet: any) => {
          if (wallet.address) {
            this.registerAccount(wallet.address);
          }
        });
        console.log(`已加载 ${wallets.length} 个已知账户`);
      }
    } catch (error) {
      console.warn('加载已知账户失败:', error);
    }
  }

  /**
   * 私有方法：保存钱包到本地存储
   */
  private saveWalletToLocal(wallet: WalletInfo): void {
    try {
      const stored = localStorage.getItem('cosmos-wallets');
      const wallets = stored ? JSON.parse(stored) : [];
      
      // 避免重复添加
      if (!wallets.find((w: any) => w.address === wallet.address)) {
        wallets.push(wallet);
        localStorage.setItem('cosmos-wallets', JSON.stringify(wallets));
      }
    } catch (error) {
      console.warn('保存钱包到本地失败:', error);
    }
  }

  /**
   * 私有方法：同步交易到本地链
   */
  private async syncTransactionToLocal(
    from: string,
    to: string,
    amount: string,
    denom: string,
    cosmosHash: string
  ): Promise<void> {
    try {
      // 创建一个标记交易，表示这是从Cosmos同步过来的
      const transaction = new Transaction(
        from,
        to,
        parseFloat(amount),
        0, // 无手续费，因为已在Cosmos上支付
        denom
      );

      // 添加Cosmos哈希作为引用
      (transaction as any).cosmosHash = cosmosHash;
      (transaction as any).source = 'cosmos';

      getBlockchain().addTransaction(transaction);
      console.log(`交易已同步到本地链: ${transaction.id}`);
    } catch (error) {
      console.warn('同步交易到本地链失败:', error);
    }
  }

  /**
   * 私有方法：获取同步状态
   */
  private getSyncStatus(): string {
    const states = Array.from(this.accountStates.values());
    
    if (states.length === 0) {
      return 'no_accounts';
    }

    const errorCount = states.filter(s => s.syncStatus === 'error').length;
    const syncingCount = states.filter(s => s.syncStatus === 'syncing').length;

    if (errorCount > 0) {
      return `error (${errorCount}/${states.length})`;
    }
    
    if (syncingCount > 0) {
      return `syncing (${syncingCount}/${states.length})`;
    }

    return 'synced';
  }
}

// 导出单例实例
export const integrationService = new IntegrationService();

// 暴露到全局作用域用于调试
if (typeof window !== 'undefined') {
  (window as any).integrationService = integrationService;
}
