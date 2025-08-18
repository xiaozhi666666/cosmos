/**
 * 基于浏览器的RPC服务器实现
 * 
 * 由于这是一个前端应用，无法创建真正的HTTP服务器，
 * 所以我们创建一个模拟的RPC服务器来处理请求
 * 
 * 特性：
 * - 支持JSON-RPC 2.0协议
 * - 异步请求处理
 * - 错误处理和状态管理
 * - 请求日志记录
 * - 批量请求支持
 */

import { rpcService, RPCRequest, RPCResponse, RPCMethod } from './rpc';

// 服务器配置
interface ServerConfig {
  port: number;
  host: string;
  logRequests: boolean;
  enableCors: boolean;
  maxRequestSize: number;
}

// 请求日志
interface RequestLog {
  timestamp: number;
  method: RPCMethod;
  params?: any;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * 浏览器RPC服务器类
 */
export class RPCServer {
  private config: ServerConfig;
  private isRunning = false;
  private requestLogs: RequestLog[] = [];
  private maxLogs = 1000;
  private requestCount = 0;
  
  constructor(config: Partial<ServerConfig> = {}) {
    this.config = {
      port: 3001,
      host: 'localhost',
      logRequests: true,
      enableCors: true,
      maxRequestSize: 1024 * 1024, // 1MB
      ...config
    };
  }

  /**
   * 启动RPC服务器
   */
  start(): void {
    if (this.isRunning) {
      console.warn('RPC服务器已在运行中');
      return;
    }

    this.isRunning = true;
    console.log(`RPC服务器已启动 (模拟模式)`);
    console.log(`服务地址: http://${this.config.host}:${this.config.port}`);
    console.log('支持的方法:', this.getSupportedMethods());

    // 暴露全局RPC接口
    this.exposeGlobalInterface();
  }

  /**
   * 停止RPC服务器
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('RPC服务器未运行');
      return;
    }

    this.isRunning = false;
    console.log('RPC服务器已停止');

    // 清理全局接口
    this.cleanupGlobalInterface();
  }

  /**
   * 处理RPC请求
   */
  async handleRequest(requestData: string): Promise<string> {
    if (!this.isRunning) {
      throw new Error('RPC服务器未运行');
    }

    const startTime = Date.now();
    let request: RPCRequest | RPCRequest[] | undefined;
    let response: RPCResponse | RPCResponse[] | undefined;

    try {
      // 解析请求
      request = JSON.parse(requestData);
      
      // 验证请求大小
      if (requestData.length > this.config.maxRequestSize) {
        throw new Error('请求过大');
      }

      // 处理批量请求
      if (Array.isArray(request)) {
        response = await this.handleBatchRequest(request);
      } else if (request) {
        response = await this.handleSingleRequest(request);
      }

      return JSON.stringify(response);
    } catch (error: any) {
      console.error('RPC请求处理失败:', error);
      
      const errorResponse: RPCResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error',
          data: error.message
        },
        id: null
      };

      return JSON.stringify(errorResponse);
    } finally {
      // 记录请求日志
      if (this.config.logRequests && request && response) {
        this.logRequest(request as any, Date.now() - startTime, response as any);
      }
    }
  }

  /**
   * 处理单个RPC请求
   */
  private async handleSingleRequest(request: RPCRequest): Promise<RPCResponse> {
    this.requestCount++;
    console.log(`[RPC] ${request.method}`, request.params || '');

    return await rpcService.handleRequest(request);
  }

  /**
   * 处理批量RPC请求
   */
  private async handleBatchRequest(requests: RPCRequest[]): Promise<RPCResponse[]> {
    if (requests.length === 0) {
      throw new Error('批量请求不能为空');
    }

    if (requests.length > 100) {
      throw new Error('批量请求过多（最大100个）');
    }

    console.log(`[RPC Batch] 处理 ${requests.length} 个请求`);
    return await rpcService.handleBatchRequest(requests);
  }

  /**
   * 记录请求日志
   */
  private logRequest(
    request: RPCRequest | RPCRequest[],
    duration: number,
    response?: RPCResponse | RPCResponse[]
  ): void {
    const methods = Array.isArray(request) 
      ? request.map(r => r.method)
      : [request.method];

    const success = Array.isArray(response)
      ? response.every(r => !r.error)
      : !response?.error;

    const error = Array.isArray(response)
      ? response.find(r => r.error)?.error?.message
      : response?.error?.message;

    methods.forEach(method => {
      const log: RequestLog = {
        timestamp: Date.now(),
        method,
        params: Array.isArray(request) ? undefined : request.params,
        duration,
        success,
        error
      };

      this.requestLogs.unshift(log);

      // 限制日志数量
      if (this.requestLogs.length > this.maxLogs) {
        this.requestLogs = this.requestLogs.slice(0, this.maxLogs);
      }
    });
  }

  /**
   * 获取支持的RPC方法列表
   */
  getSupportedMethods(): RPCMethod[] {
    return [
      // 区块链查询
      'getBlockCount',
      'getBlock', 
      'getTransaction',
      'getBalance',
      'getAccount',
      'getChainInfo',
      
      // 交易操作
      'sendTransaction',
      'sendRawTransaction',
      'getPendingTransactions',
      'estimateGas',
      
      // 挖矿操作
      'mine',
      'getMiningInfo',
      'startMining',
      'stopMining',
      
      // Cosmos操作
      'createWallet',
      'importWallet',
      'getWalletBalance',
      'sendCosmosTokens',
      'delegateTokens',
      'getValidators',
      
      // 系统操作
      'getNodeInfo',
      'reset',
      'backup',
      'restore'
    ];
  }

  /**
   * 获取服务器状态
   */
  getStatus(): {
    isRunning: boolean;
    config: ServerConfig;
    requestCount: number;
    recentRequests: RequestLog[];
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      requestCount: this.requestCount,
      recentRequests: this.requestLogs.slice(0, 10)
    };
  }

  /**
   * 获取请求统计
   */
  getStats(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    topMethods: { method: string; count: number }[];
  } {
    const successful = this.requestLogs.filter(log => log.success).length;
    const failed = this.requestLogs.length - successful;
    const avgTime = this.requestLogs.length > 0
      ? this.requestLogs.reduce((sum, log) => sum + log.duration, 0) / this.requestLogs.length
      : 0;

    // 统计使用最多的方法
    const methodCounts = this.requestLogs.reduce((acc, log) => {
      acc[log.method] = (acc[log.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topMethods = Object.entries(methodCounts)
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRequests: this.requestCount,
      successfulRequests: successful,
      failedRequests: failed,
      averageResponseTime: Math.round(avgTime),
      topMethods
    };
  }

  /**
   * 清除请求日志
   */
  clearLogs(): void {
    this.requestLogs = [];
    this.requestCount = 0;
    console.log('RPC请求日志已清除');
  }

  /**
   * 暴露全局RPC接口
   */
  private exposeGlobalInterface(): void {
    if (typeof window !== 'undefined') {
      // 创建全局RPC客户端
      (window as any).rpc = {
        // 简单的RPC调用接口
        call: async (method: RPCMethod, params?: any) => {
          const request: RPCRequest = {
            jsonrpc: '2.0',
            method,
            params,
            id: Date.now()
          };

          const responseStr = await this.handleRequest(JSON.stringify(request));
          const response: RPCResponse = JSON.parse(responseStr);

          if (response.error) {
            throw new Error(`RPC Error ${response.error.code}: ${response.error.message}`);
          }

          return response.result;
        },

        // 原始请求接口
        request: async (requestStr: string) => {
          return await this.handleRequest(requestStr);
        },

        // 获取服务器状态
        status: () => this.getStatus(),

        // 获取统计信息
        stats: () => this.getStats(),

        // 获取支持的方法
        methods: () => this.getSupportedMethods()
      };

      // 服务器管理接口
      (window as any).rpcServer = this;

      console.log('全局RPC接口已暴露:');
      console.log('- window.rpc.call(method, params) - 调用RPC方法');
      console.log('- window.rpc.request(jsonString) - 发送原始请求');
      console.log('- window.rpc.status() - 获取服务器状态');
      console.log('- window.rpc.stats() - 获取统计信息');
      console.log('- window.rpcServer - 服务器实例');
    }
  }

  /**
   * 清理全局接口
   */
  private cleanupGlobalInterface(): void {
    if (typeof window !== 'undefined') {
      delete (window as any).rpc;
      delete (window as any).rpcServer;
    }
  }

  /**
   * 创建RPC客户端助手
   */
  createClient(): RPCClient {
    return new RPCClient(this);
  }
}

/**
 * RPC客户端类
 */
export class RPCClient {
  constructor(private server: RPCServer) {}

  async call(method: RPCMethod, params?: any): Promise<any> {
    const request: RPCRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now()
    };

    const responseStr = await this.server.handleRequest(JSON.stringify(request));
    const response: RPCResponse = JSON.parse(responseStr);

    if (response.error) {
      throw new Error(`RPC Error ${response.error.code}: ${response.error.message}`);
    }

    return response.result;
  }

  async batchCall(calls: { method: RPCMethod; params?: any }[]): Promise<any[]> {
    const requests: RPCRequest[] = calls.map((call, index) => ({
      jsonrpc: '2.0',
      method: call.method,
      params: call.params,
      id: index
    }));

    const responseStr = await this.server.handleRequest(JSON.stringify(requests));
    const responses: RPCResponse[] = JSON.parse(responseStr);

    return responses.map(response => {
      if (response.error) {
        throw new Error(`RPC Error ${response.error.code}: ${response.error.message}`);
      }
      return response.result;
    });
  }

  // === 便捷方法 ===

  // 区块链查询
  async getBlockCount(): Promise<number> {
    return this.call('getBlockCount');
  }

  async getBlock(heightOrHash?: number | string): Promise<any> {
    const params = typeof heightOrHash === 'number' 
      ? { height: heightOrHash }
      : typeof heightOrHash === 'string'
      ? { hash: heightOrHash }
      : undefined;
    
    return this.call('getBlock', params);
  }

  async getBalance(address: string, denom?: string): Promise<any> {
    return this.call('getBalance', { address, denom });
  }

  // 交易操作
  async sendTransaction(from: string, to: string, amount: string, denom?: string): Promise<string> {
    return this.call('sendTransaction', { from, to, amount, denom });
  }

  // 挖矿操作
  async mine(minerAddress: string): Promise<any> {
    return this.call('mine', { minerAddress });
  }

  async startMining(minerAddress: string): Promise<any> {
    return this.call('startMining', { minerAddress });
  }

  async stopMining(): Promise<any> {
    return this.call('stopMining');
  }

  // Cosmos操作
  async createWallet(): Promise<any> {
    return this.call('createWallet');
  }

  async sendCosmosTokens(
    mnemonic: string,
    fromAddress: string,
    toAddress: string,
    amount: string,
    denom?: string
  ): Promise<string> {
    return this.call('sendCosmosTokens', {
      mnemonic,
      fromAddress,
      toAddress,
      amount,
      denom
    });
  }
}

// 创建并导出默认服务器实例
export const rpcServer = new RPCServer();

// 自动启动服务器
if (typeof window !== 'undefined') {
  // 确保在应用初始化后启动
  setTimeout(() => {
    rpcServer.start();
  }, 1000);
}
