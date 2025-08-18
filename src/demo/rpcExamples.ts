/**
 * RPC服务使用示例
 * 
 * 演示如何使用RPC服务进行各种区块链操作
 */

import { rpcService } from '../services/rpc';
import { rpcServer } from '../services/rpcServer';
import { integrationService } from '../services/integration';

/**
 * 基础RPC调用示例
 */
export async function basicRPCExamples() {
  console.log('=== 基础RPC调用示例 ===');
  
  try {
    // 获取区块数量
    const blockCount = await rpcService.call('getBlockCount');
    console.log('当前区块数量:', blockCount);

    // 获取链信息
    const chainInfo = await rpcService.call('getChainInfo');
    console.log('链信息:', chainInfo);

    // 获取最新区块
    const latestBlock = await rpcService.call('getBlock');
    console.log('最新区块:', latestBlock);

    // 获取创世区块
    const genesisBlock = await rpcService.call('getBlock', { height: 0 });
    console.log('创世区块:', genesisBlock);

  } catch (error) {
    console.error('基础RPC调用失败:', error);
  }
}

/**
 * 钱包操作示例
 */
export async function walletOperationExamples() {
  console.log('=== 钱包操作示例 ===');
  
  try {
    // 创建新钱包
    const wallet = await rpcService.call('createWallet');
    console.log('新钱包已创建:', wallet);

    // 获取账户余额
    const balance = await rpcService.call('getBalance', { 
      address: wallet.address 
    });
    console.log('钱包余额:', balance);

    // 获取账户信息
    const account = await rpcService.call('getAccount', { 
      address: wallet.address 
    });
    console.log('账户信息:', account);

    return wallet;
  } catch (error) {
    console.error('钱包操作失败:', error);
    return null;
  }
}

/**
 * 交易操作示例
 */
export async function transactionExamples() {
  console.log('=== 交易操作示例 ===');
  
  try {
    // 发送交易
    const txHash = await rpcService.call('sendTransaction', {
      from: 'cosmos1genesis1',
      to: 'cosmos1genesis2',
      amount: '10',
      denom: 'COSMOS'
    });
    console.log('交易已发送，哈希:', txHash);

    // 获取待处理交易
    const pendingTxs = await rpcService.call('getPendingTransactions');
    console.log('待处理交易:', pendingTxs);

    // 估算Gas费用
    const gasEstimate = await rpcService.call('estimateGas', {
      from: 'cosmos1genesis1',
      to: 'cosmos1genesis2',
      amount: '10'
    });
    console.log('Gas估算:', gasEstimate);

    return txHash;
  } catch (error) {
    console.error('交易操作失败:', error);
    return null;
  }
}

/**
 * 挖矿操作示例
 */
export async function miningExamples() {
  console.log('=== 挖矿操作示例 ===');
  
  try {
    // 获取挖矿信息
    const miningInfo = await rpcService.call('getMiningInfo');
    console.log('挖矿信息:', miningInfo);

    // 手动挖矿
    const block = await rpcService.call('mine', { 
      minerAddress: 'cosmos1miner123' 
    });
    console.log('挖矿成功，新区块:', block);

    // 启动自动挖矿
    const startResult = await rpcService.call('startMining', { 
      minerAddress: 'cosmos1miner123' 
    });
    console.log('自动挖矿启动:', startResult);

    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 停止自动挖矿
    const stopResult = await rpcService.call('stopMining');
    console.log('自动挖矿停止:', stopResult);

    return block;
  } catch (error) {
    console.error('挖矿操作失败:', error);
    return null;
  }
}

/**
 * 系统操作示例
 */
export async function systemOperationExamples() {
  console.log('=== 系统操作示例 ===');
  
  try {
    // 获取节点信息
    const nodeInfo = await rpcService.call('getNodeInfo');
    console.log('节点信息:', nodeInfo);

    // 创建备份
    const backupResult = await rpcService.call('backup');
    console.log('备份结果:', backupResult);

    // 获取服务器统计
    const serverStats = rpcServer.getStats();
    console.log('服务器统计:', serverStats);

  } catch (error) {
    console.error('系统操作失败:', error);
  }
}

/**
 * 集成服务示例
 */
export async function integrationServiceExamples() {
  console.log('=== 集成服务示例 ===');
  
  try {
    // 初始化集成服务
    await integrationService.initialize();
    console.log('集成服务初始化完成');

    // 创建统一钱包
    const wallet = await integrationService.createUnifiedWallet();
    console.log('统一钱包已创建:', wallet);

    // 获取统一余额
    const balance = await integrationService.getUnifiedBalance(wallet.address);
    console.log('统一余额:', balance);

    // 发送统一交易
    const txResult = await integrationService.sendUnifiedTransaction(
      'cosmos1genesis1',
      wallet.address,
      '5',
      'COSMOS'
    );
    console.log('统一交易结果:', txResult);

    // 同步账户状态
    await integrationService.syncAccount(wallet.address);
    console.log('账户同步完成');

    // 获取账户状态
    const accountState = integrationService.getAccountState(wallet.address);
    console.log('账户状态:', accountState);

    // 获取链信息
    const chainInfo = await integrationService.getUnifiedChainInfo();
    console.log('统一链信息:', chainInfo);

    return wallet;
  } catch (error) {
    console.error('集成服务操作失败:', error);
    return null;
  }
}

/**
 * 批量RPC调用示例
 */
export async function batchRPCExamples() {
  console.log('=== 批量RPC调用示例 ===');
  
  try {
    const client = rpcServer.createClient();

    // 批量调用多个方法
    const results = await client.batchCall([
      { method: 'getBlockCount' },
      { method: 'getChainInfo' },
      { method: 'getMiningInfo' },
      { method: 'getPendingTransactions' }
    ]);

    console.log('批量调用结果:', results);
    return results;
  } catch (error) {
    console.error('批量RPC调用失败:', error);
    return null;
  }
}

/**
 * 完整的演示流程
 */
export async function fullDemoFlow() {
  console.log('🚀 开始完整的RPC演示流程...\n');

  try {
    // 1. 基础操作
    await basicRPCExamples();
    console.log('\n');

    // 2. 钱包操作
    const wallet = await walletOperationExamples();
    console.log('\n');

    // 3. 交易操作
    const txHash = await transactionExamples();
    console.log('\n');

    // 4. 挖矿操作
    const block = await miningExamples();
    console.log('\n');

    // 5. 集成服务
    const unifiedWallet = await integrationServiceExamples();
    console.log('\n');

    // 6. 批量操作
    const batchResults = await batchRPCExamples();
    console.log('\n');

    // 7. 系统操作
    await systemOperationExamples();

    console.log('✅ 完整演示流程完成！');
    
    return {
      wallet,
      unifiedWallet,
      txHash,
      block,
      batchResults
    };

  } catch (error) {
    console.error('❌ 演示流程出错:', error);
    return null;
  }
}

// 暴露到全局作用域用于浏览器调试
if (typeof window !== 'undefined') {
  (window as any).rpcExamples = {
    basic: basicRPCExamples,
    wallet: walletOperationExamples,
    transaction: transactionExamples,
    mining: miningExamples,
    system: systemOperationExamples,
    integration: integrationServiceExamples,
    batch: batchRPCExamples,
    fullDemo: fullDemoFlow
  };

  console.log('RPC示例已暴露到全局作用域:');
  console.log('- window.rpcExamples.basic() - 基础RPC调用');
  console.log('- window.rpcExamples.wallet() - 钱包操作');
  console.log('- window.rpcExamples.transaction() - 交易操作');
  console.log('- window.rpcExamples.mining() - 挖矿操作');
  console.log('- window.rpcExamples.integration() - 集成服务');
  console.log('- window.rpcExamples.fullDemo() - 完整演示流程');
}
