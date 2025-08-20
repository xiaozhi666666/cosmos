/**
 * 区块链RPC服务实现
 * 
 * 提供标准的JSON-RPC 2.0接口，集成本地区块链和Cosmos网络功能
 * 
 * 主要功能：
 * - 区块链查询：区块、交易、账户信息
 * - 交易操作：发送交易、查询交易状态
 * - 挖矿操作：手动挖矿、获取挖矿信息
 * - Cosmos集成：钱包管理、代币操作、委托
 * - 网络信息：链状态、网络配置
 */

import { getBlockchain, Block, ITransaction } from './blockchain';
import { cosmosService, WalletInfo, TokenInfo } from './cosmos';

// RPC方法类型定义
export type RPCMethod = 
  // 区块链查询方法
  | 'getBlockCount'
  | 'getBlock'
  | 'getTransaction'
  | 'getBalance'
  | 'getAccount'
  | 'getChainInfo'
  
  // 交易方法
  | 'sendTransaction'
  | 'sendRawTransaction'
  | 'getPendingTransactions'
  | 'estimateGas'
  
  // 挖矿方法
  | 'mine'
  | 'getMiningInfo'
  | 'startMining'
  | 'stopMining'
  
  // Cosmos方法
  | 'createWallet'
  | 'importWallet'
  | 'getWalletBalance'
  | 'sendCosmosTokens'
  | 'delegateTokens'
  | 'getValidators'
  
  // 系统方法
  | 'getNodeInfo'
  | 'reset'
  | 'backup'
  | 'restore';

// RPC请求接口
export interface RPCRequest {
  jsonrpc: '2.0';
  method: RPCMethod;
  params?: any;
  id: number | string;
}

// RPC响应接口
export interface RPCResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number | string | null;
}

// RPC错误代码
export const RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // 自定义错误代码
  INSUFFICIENT_FUNDS: -32001,
  TRANSACTION_REJECTED: -32002,
  MINING_ERROR: -32003,
  WALLET_ERROR: -32004,
  COSMOS_ERROR: -32005
};

/**
 * 挖矿状态管理
 */
class MiningManager {
  private isActive = false;
  private intervalId: NodeJS.Timeout | null = null;
  private miningCallback: ((block: Block) => void) | null = null;

  start(minerAddress: string, onBlockMined?: (block: Block) => void): void {
    if (this.isActive) {
      throw new Error('挖矿已在进行中');
    }

    this.isActive = true;
    this.miningCallback = onBlockMined || null;

    console.log(`开始自动挖矿，矿工地址: ${minerAddress}`);
    
    this.intervalId = setInterval(async () => {
      try {
        if (getBlockchain().transactionPool.getSize() > 0) {
          const block = getBlockchain().mineBlock(minerAddress);
          console.log(`挖到新区块: #${block.index}`);
          
          if (this.miningCallback) {
            this.miningCallback(block);
          }
        }
      } catch (error) {
        console.error('自动挖矿错误:', error);
      }
    }, 30000); // 每30秒尝试挖矿
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isActive = false;
    this.miningCallback = null;
    console.log('自动挖矿已停止');
  }

  getStatus(): { active: boolean; pendingTx: number } {
    return {
      active: this.isActive,
      pendingTx: getBlockchain().transactionPool.getSize()
    };
  }
}

/**
 * RPC服务主类
 */
export class RPCService {
  private miningManager = new MiningManager();
  private requestId = 0;

  constructor() {
    console.log('RPC服务已初始化');
  }

  /**
   * 处理RPC请求
   */
  async handleRequest(request: RPCRequest): Promise<RPCResponse> {
    // 验证请求格式
    if (!this.validateRequest(request)) {
      return this.createErrorResponse(
        (request as any)?.id || null,
        RPC_ERRORS.INVALID_REQUEST,
        '无效的RPC请求格式'
      );
    }

    try {
      const result = await this.executeMethod(request.method, request.params);
      return {
        jsonrpc: '2.0',
        result,
        id: request.id
      };
    } catch (error: any) {
      console.error(`RPC方法 ${request.method} 执行失败:`, error);
      
      return this.createErrorResponse(
        request.id,
        error.code || RPC_ERRORS.INTERNAL_ERROR,
        error.message || '内部服务器错误',
        error.data
      );
    }
  }

  /**
   * 验证RPC请求格式
   */
  private validateRequest(request: any): request is RPCRequest {
    return (
      request &&
      request.jsonrpc === '2.0' &&
      typeof request.method === 'string' &&
      (request.id !== undefined)
    );
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse(
    id: number | string | null,
    code: number,
    message: string,
    data?: any
  ): RPCResponse {
    return {
      jsonrpc: '2.0',
      error: { code, message, data },
      id: id || 0
    };
  }

  /**
   * 执行RPC方法
   */
  private async executeMethod(method: RPCMethod, params?: any): Promise<any> {
    switch (method) {
      // 区块链查询方法
      case 'getBlockCount':
        return getBlockchain().chain.length;

      case 'getBlock':
        return this.getBlock(params);

      case 'getTransaction':
        return this.getTransaction(params);

      case 'getBalance':
        return this.getBalance(params);

      case 'getAccount':
        return this.getAccount(params);

      case 'getChainInfo':
        return this.getChainInfo();

      // 交易方法
      case 'sendTransaction':
        return this.sendTransaction(params);

      case 'sendRawTransaction':
        return this.sendRawTransaction(params);

      case 'getPendingTransactions':
        return this.getPendingTransactions();

      case 'estimateGas':
        return this.estimateGas(params);

      // 挖矿方法
      case 'mine':
        return this.mine(params);

      case 'getMiningInfo':
        return this.getMiningInfo();

      case 'startMining':
        return this.startMining(params);

      case 'stopMining':
        return this.stopMining();

      // Cosmos方法
      case 'createWallet':
        return this.createWallet();

      case 'importWallet':
        return this.importWallet(params);

      case 'getWalletBalance':
        return this.getWalletBalance(params);

      case 'sendCosmosTokens':
        return this.sendCosmosTokens(params);

      case 'delegateTokens':
        return this.delegateTokens(params);

      case 'getValidators':
        return this.getValidators();

      // 系统方法
      case 'getNodeInfo':
        return this.getNodeInfo();

      case 'reset':
        return this.reset();

      case 'backup':
        return this.backup();

      case 'restore':
        return this.restore(params);

      default:
              const error = new Error(`方法 '${method}' 未找到`) as any;
      error.code = RPC_ERRORS.METHOD_NOT_FOUND;
      throw error;
    }
  }

  // ===== 区块链查询方法实现 =====

  private getBlock(params: { height?: number; hash?: string }): Block | null {
    if (params.height !== undefined) {
      return getBlockchain().chain[params.height] || null;
    }
    
    if (params.hash) {
      return getBlockchain().chain.find(block => block.hash === params.hash) || null;
    }
    
    // 返回最新区块
    return getBlockchain().getLatestBlock();
  }

  private getTransaction(params: { txid: string }): ITransaction | null {
    if (!params.txid) {
      const error = new Error('缺少交易ID参数') as any;
      error.code = RPC_ERRORS.INVALID_PARAMS;
      throw error;
    }

    for (const block of getBlockchain().chain) {
      const tx = block.data.find(t => t.id === params.txid);
      if (tx) {
        return {
          ...tx,
          blockHeight: block.index,
          blockHash: block.hash,
          confirmations: getBlockchain().chain.length - block.index
        } as any;
      }
    }

    return null;
  }

  private getBalance(params: { address: string; denom?: string }): any {
    if (!params.address) {
      const error = new Error('缺少地址参数') as any;
      error.code = RPC_ERRORS.INVALID_PARAMS;
      throw error;
    }

    if (params.denom) {
      return {
        address: params.address,
        denom: params.denom,
        amount: getBlockchain().getBalance(params.address, params.denom).toString()
      };
    }

    return {
      address: params.address,
      balances: getBlockchain().getAllBalances(params.address)
    };
  }

  private async getAccount(params: { address: string }): Promise<any> {
    if (!params.address) {
      const error = new Error('缺少地址参数') as any;
      error.code = RPC_ERRORS.INVALID_PARAMS;
      throw error;
    }

    const balances = getBlockchain().getAllBalances(params.address);
    const cosmosAccount = await cosmosService.getAccount(params.address);

    return {
      address: params.address,
      balances,
      cosmosAccount,
      nonce: 0, // 简化实现
      sequence: cosmosAccount?.sequence || 0
    };
  }

  private getChainInfo(): any {
    const stats = getBlockchain().getStats();
    const latestBlock = getBlockchain().getLatestBlock();

    return {
      chainId: 'cosmos-local-chain',
      networkId: 'local',
      latestBlockHeight: stats.totalBlocks - 1,
      latestBlockHash: latestBlock.hash,
      latestBlockTime: latestBlock.timestamp,
      difficulty: stats.difficulty,
      pendingTransactions: stats.pendingTransactions,
      isValid: stats.isValid
    };
  }

  // ===== 交易方法实现 =====

  private sendTransaction(params: {
    from: string;
    to: string;
    amount: string;
    denom?: string;
    fee?: string;
  }): string {
    if (!params.from || !params.to || !params.amount) {
      const error = new Error('缺少必要参数: from, to, amount') as any;
      error.code = RPC_ERRORS.INVALID_PARAMS;
      throw error;
    }

    const amount = parseFloat(params.amount);
    const fee = parseFloat(params.fee || '0.001');
    const denom = params.denom || 'COSMOS';

    const transaction = getBlockchain().createTransaction(
      params.from,
      params.to,
      amount,
      denom,
      fee
    );

    const success = getBlockchain().addTransaction(transaction);
    if (!success) {
      const error = new Error('交易被拒绝，可能是余额不足') as any;
      error.code = RPC_ERRORS.TRANSACTION_REJECTED;
      throw error;
    }

    return transaction.id;
  }

  private sendRawTransaction(params: { hexString: string }): string {
    // 简化实现，实际应该解析十六进制交易数据
    const error = new Error('原始交易发送暂未实现') as any;
    error.code = RPC_ERRORS.METHOD_NOT_FOUND;
    throw error;
  }

  private getPendingTransactions(): ITransaction[] {
    return getBlockchain().transactionPool.getPendingTransactions();
  }

  private estimateGas(params: {
    from: string;
    to: string;
    amount: string;
  }): { gasLimit: number; gasPrice: string } {
    // 简化的Gas估算
    return {
      gasLimit: 21000,
      gasPrice: '0.001'
    };
  }

  // ===== 挖矿方法实现 =====

  private mine(params: { minerAddress: string }): Block {
    if (!params.minerAddress) {
      const error = new Error('缺少矿地址参数') as any;
      error.code = RPC_ERRORS.INVALID_PARAMS;
      throw error;
    }

    try {
      return getBlockchain().mineBlock(params.minerAddress);
    } catch (err: any) {
      const error = new Error(`挖矿失败: ${err.message}`) as any;
      error.code = RPC_ERRORS.MINING_ERROR;
      throw error;
    }
  }

  private getMiningInfo(): any {
    return {
      ...this.miningManager.getStatus(),
      difficulty: getBlockchain().difficulty,
      miningReward: getBlockchain().miningReward,
      pendingTransactions: getBlockchain().transactionPool.getSize(),
      latestBlockHeight: getBlockchain().chain.length - 1
    };
  }

  private startMining(params: { minerAddress: string }): { message: string } {
    if (!params.minerAddress) {
      const error = new Error('缺少矿工地址参数') as any;
      error.code = RPC_ERRORS.INVALID_PARAMS;
      throw error;
    }

    try {
      this.miningManager.start(params.minerAddress);
      return { message: '自动挖矿已启动' };
    } catch (err: any) {
      const error = new Error(err.message) as any;
      error.code = RPC_ERRORS.MINING_ERROR;
      throw error;
    }
  }

  private stopMining(): { message: string } {
    this.miningManager.stop();
    return { message: '自动挖矿已停止' };
  }

  // ===== Cosmos方法实现 =====

  private async createWallet(): Promise<WalletInfo> {
    try {
      return await cosmosService.createWallet();
    } catch (err: any) {
      const error = new Error(`创建钱包失败: ${err.message}`) as any;
      error.code = RPC_ERRORS.WALLET_ERROR;
      throw error;
    }
  }

  private async importWallet(params: { mnemonic: string }): Promise<WalletInfo> {
    if (!params.mnemonic) {
      const error = new Error('缺少助记词参数') as any;
      error.code = RPC_ERRORS.INVALID_PARAMS;
      throw error;
    }

    try {
      return await cosmosService.importWallet(params.mnemonic);
    } catch (err: any) {
      const error = new Error(`导入钱包失败: ${err.message}`) as any;
      error.code = RPC_ERRORS.WALLET_ERROR;
      throw error;
    }
  }

  private async getWalletBalance(params: { address: string }): Promise<TokenInfo[]> {
    if (!params.address) {
      const error = new Error('缺少地址参数') as any;
      error.code = RPC_ERRORS.INVALID_PARAMS;
      throw error;
    }

    try {
      return await cosmosService.getBalance(params.address);
    } catch (err: any) {
      const error = new Error(`获取余额失败: ${err.message}`) as any;
      error.code = RPC_ERRORS.COSMOS_ERROR;
      throw error;
    }
  }

  private async sendCosmosTokens(params: {
    mnemonic: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    denom?: string;
    memo?: string;
  }): Promise<string> {
    const { mnemonic, fromAddress, toAddress, amount, denom, memo } = params;

    if (!mnemonic || !fromAddress || !toAddress || !amount) {
      const error = new Error('缺少必要参数') as any;
      error.code = RPC_ERRORS.INVALID_PARAMS;
      throw error;
    }

    try {
      return await cosmosService.sendTokens(
        mnemonic,
        fromAddress,
        toAddress,
        amount,
        denom,
        memo
      );
    } catch (err: any) {
      const error = new Error(`发送代币失败: ${err.message}`) as any;
      error.code = RPC_ERRORS.COSMOS_ERROR;
      throw error;
    }
  }

  private async delegateTokens(params: {
    mnemonic: string;
    delegatorAddress: string;
    validatorAddress: string;
    amount: string;
    denom?: string;
  }): Promise<string> {
    const { mnemonic, delegatorAddress, validatorAddress, amount, denom } = params;

    if (!mnemonic || !delegatorAddress || !validatorAddress || !amount) {
      const error = new Error('缺少必要参数') as any;
      error.code = RPC_ERRORS.INVALID_PARAMS;
      throw error;
    }

    try {
      return await cosmosService.delegateTokens(
        mnemonic,
        delegatorAddress,
        validatorAddress,
        amount,
        denom
      );
    } catch (err: any) {
      const error = new Error(`委托失败: ${err.message}`) as any;
      error.code = RPC_ERRORS.COSMOS_ERROR;
      throw error;
    }
  }

  private async getValidators(): Promise<any> {
    try {
      return await cosmosService.getValidators();
    } catch (error: any) {
      // 如果Cosmos验证者查询失败，返回模拟数据
      return [
        {
          operatorAddress: 'cosmosvaloper1example1',
          moniker: 'Validator 1',
          jailed: false,
          status: 'BOND_STATUS_BONDED',
          tokens: '1000000',
          commission: '0.05'
        },
        {
          operatorAddress: 'cosmosvaloper1example2',
          moniker: 'Validator 2',
          jailed: false,
          status: 'BOND_STATUS_BONDED',
          tokens: '500000',
          commission: '0.10'
        }
      ];
    }
  }

  // ===== 系统方法实现 =====

  private getNodeInfo(): any {
    return {
      version: '1.0.0',
      protocol: 'cosmos-local',
      chainId: 'cosmos-local-chain',
      nodeId: 'local-node-1',
      network: cosmosService.getCurrentNetwork(),
      uptime: Date.now(),
      connections: 1,
      syncStatus: {
        syncing: false,
        latestBlockHeight: getBlockchain().chain.length - 1,
        latestBlockTime: getBlockchain().getLatestBlock().timestamp
      }
    };
  }

  private reset(): { message: string } {
    try {
      getBlockchain().reset();
      this.miningManager.stop();
      return { message: '区块链已重置' };
    } catch (err: any) {
      const error = new Error(`重置失败: ${err.message}`) as any;
      error.code = RPC_ERRORS.INTERNAL_ERROR;
      throw error;
    }
  }

  private backup(): { message: string; timestamp: number } {
    try {
      const timestamp = Date.now();
      const success = getBlockchain().saveToStorage();
      
      if (!success) {
        throw new Error('保存失败');
      }

      return {
        message: '区块链数据已备份',
        timestamp
      };
    } catch (err: any) {
      const error = new Error(`备份失败: ${err.message}`) as any;
      error.code = RPC_ERRORS.INTERNAL_ERROR;
      throw error;
    }
  }

  private restore(params: { snapshotName?: string }): { message: string } {
    try {
      let success = false;

      if (params.snapshotName) {
        success = getBlockchain().restoreFromSnapshot(params.snapshotName);
      } else {
        success = getBlockchain().loadFromStorage();
      }

      if (!success) {
        throw new Error('恢复失败');
      }

      return { message: '区块链数据已恢复' };
    } catch (err: any) {
      const error = new Error(`恢复失败: ${err.message}`) as any;
      error.code = RPC_ERRORS.INTERNAL_ERROR;
      throw error;
    }
  }

  /**
   * 批量处理RPC请求
   */
  async handleBatchRequest(requests: RPCRequest[]): Promise<RPCResponse[]> {
    const responses: RPCResponse[] = [];

    for (const request of requests) {
      const response = await this.handleRequest(request);
      responses.push(response);
    }

    return responses;
  }

  /**
   * 生成请求ID
   */
  generateRequestId(): number {
    return ++this.requestId;
  }

  /**
   * 调用RPC方法的便捷函数
   */
  async call(method: RPCMethod, params?: any): Promise<any> {
    const request: RPCRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: this.generateRequestId()
    };

    const response = await this.handleRequest(request);
    
    if (response.error) {
      throw new Error(`RPC错误 ${response.error.code}: ${response.error.message}`);
    }

    return response.result;
  }
}

// 导出单例实例
export const rpcService = new RPCService();

// 暴露到全局作用域用于调试
if (typeof window !== 'undefined') {
  (window as any).rpcService = rpcService;
}
