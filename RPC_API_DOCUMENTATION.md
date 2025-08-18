# Cosmos区块链RPC API文档

## 概述

本项目实现了完整的JSON-RPC 2.0服务，集成了本地JavaScript区块链和Cosmos网络功能。RPC服务提供了统一的API接口，支持区块链查询、交易操作、挖矿管理和Cosmos集成等功能。

## 服务架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用       │────│   RPC服务器      │────│   RPC服务        │
│  (React UI)     │    │  (rpcServer.ts) │    │  (rpc.ts)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │   集成服务       │────│   区块链核心     │
                       │(integration.ts) │    │ (blockchain.ts) │
                       └─────────────────┘    └─────────────────┘
                                │                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │  Cosmos服务     │    │   加密工具       │
                       │ (cosmos.ts)     │    │  (crypto.ts)    │
                       └─────────────────┘    └─────────────────┘
```

## RPC方法列表

### 区块链查询方法

#### getBlockCount
获取区块链的总区块数

**请求:**
```json
{
  "jsonrpc": "2.0",
  "method": "getBlockCount",
  "id": 1
}
```

**响应:**
```json
{
  "jsonrpc": "2.0",
  "result": 42,
  "id": 1
}
```

#### getBlock
获取指定区块的详细信息

**请求参数:**
- `height` (可选): 区块高度
- `hash` (可选): 区块哈希

**请求示例:**
```json
{
  "jsonrpc": "2.0",
  "method": "getBlock",
  "params": {
    "height": 10
  },
  "id": 1
}
```

**响应:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "index": 10,
    "timestamp": 1640995200000,
    "data": [...],
    "previousHash": "abc123...",
    "hash": "def456...",
    "nonce": 123456,
    "difficulty": 4,
    "merkleRoot": "ghi789...",
    "miner": "cosmos1miner123",
    "reward": 50
  },
  "id": 1
}
```

#### getTransaction
根据交易ID获取交易详情

**请求参数:**
- `txid`: 交易ID

**请求示例:**
```json
{
  "jsonrpc": "2.0",
  "method": "getTransaction",
  "params": {
    "txid": "abc123def456"
  },
  "id": 1
}
```

#### getBalance
获取指定地址的余额

**请求参数:**
- `address`: 钱包地址
- `denom` (可选): 代币类型

**请求示例:**
```json
{
  "jsonrpc": "2.0",
  "method": "getBalance",
  "params": {
    "address": "cosmos1abc123",
    "denom": "COSMOS"
  },
  "id": 1
}
```

#### getAccount
获取账户详细信息

**请求参数:**
- `address`: 钱包地址

#### getChainInfo
获取区块链基本信息

**响应示例:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "chainId": "cosmos-local-chain",
    "networkId": "local",
    "latestBlockHeight": 41,
    "latestBlockHash": "abc123...",
    "latestBlockTime": 1640995200000,
    "difficulty": 4,
    "pendingTransactions": 5,
    "isValid": true
  },
  "id": 1
}
```

### 交易方法

#### sendTransaction
发送新交易

**请求参数:**
- `from`: 发送方地址
- `to`: 接收方地址
- `amount`: 转账金额
- `denom` (可选): 代币类型，默认"COSMOS"
- `fee` (可选): 手续费，默认0.001

**请求示例:**
```json
{
  "jsonrpc": "2.0",
  "method": "sendTransaction",
  "params": {
    "from": "cosmos1sender",
    "to": "cosmos1receiver",
    "amount": "100",
    "denom": "COSMOS",
    "fee": "0.001"
  },
  "id": 1
}
```

**响应:**
```json
{
  "jsonrpc": "2.0",
  "result": "abc123def456...", // 交易哈希
  "id": 1
}
```

#### getPendingTransactions
获取待处理的交易列表

#### estimateGas
估算交易所需的Gas费用

**请求参数:**
- `from`: 发送方地址
- `to`: 接收方地址
- `amount`: 转账金额

### 挖矿方法

#### mine
手动挖掘一个区块

**请求参数:**
- `minerAddress`: 矿工地址

**请求示例:**
```json
{
  "jsonrpc": "2.0",
  "method": "mine",
  "params": {
    "minerAddress": "cosmos1miner123"
  },
  "id": 1
}
```

#### getMiningInfo
获取挖矿相关信息

**响应示例:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "active": false,
    "pendingTx": 3,
    "difficulty": 4,
    "miningReward": 50,
    "pendingTransactions": 3,
    "latestBlockHeight": 41
  },
  "id": 1
}
```

#### startMining
启动自动挖矿

**请求参数:**
- `minerAddress`: 矿工地址

#### stopMining
停止自动挖矿

### Cosmos方法

#### createWallet
创建新的Cosmos钱包

**响应示例:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "address": "cosmos1abc123def456",
    "mnemonic": "word1 word2 word3 ...",
    "publicKey": "..."
  },
  "id": 1
}
```

#### importWallet
从助记词导入钱包

**请求参数:**
- `mnemonic`: 24位助记词

#### getWalletBalance
获取Cosmos网络上的钱包余额

**请求参数:**
- `address`: 钱包地址

#### sendCosmosTokens
在Cosmos网络上发送代币

**请求参数:**
- `mnemonic`: 钱包助记词
- `fromAddress`: 发送方地址
- `toAddress`: 接收方地址
- `amount`: 转账金额
- `denom` (可选): 代币类型
- `memo` (可选): 交易备注

#### delegateTokens
委托代币给验证者

**请求参数:**
- `mnemonic`: 钱包助记词
- `delegatorAddress`: 委托人地址
- `validatorAddress`: 验证者地址
- `amount`: 委托金额
- `denom` (可选): 代币类型

#### getValidators
获取验证者列表

### 系统方法

#### getNodeInfo
获取节点信息

**响应示例:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "version": "1.0.0",
    "protocol": "cosmos-local",
    "chainId": "cosmos-local-chain",
    "nodeId": "local-node-1",
    "network": {...},
    "uptime": 1640995200000,
    "connections": 1,
    "syncStatus": {
      "syncing": false,
      "latestBlockHeight": 41,
      "latestBlockTime": 1640995200000
    }
  },
  "id": 1
}
```

#### reset
重置区块链到初始状态

#### backup
创建区块链数据备份

#### restore
从备份恢复区块链数据

**请求参数:**
- `snapshotName` (可选): 快照名称

## 错误代码

### 标准JSON-RPC错误
- `-32700`: Parse error - 解析错误
- `-32600`: Invalid Request - 无效请求
- `-32601`: Method not found - 方法未找到
- `-32602`: Invalid params - 无效参数
- `-32603`: Internal error - 内部错误

### 自定义错误代码
- `-32001`: Insufficient funds - 余额不足
- `-32002`: Transaction rejected - 交易被拒绝
- `-32003`: Mining error - 挖矿错误
- `-32004`: Wallet error - 钱包错误
- `-32005`: Cosmos error - Cosmos网络错误

## 使用示例

### JavaScript客户端示例

```javascript
// 使用全局RPC客户端
const blockCount = await window.rpc.call('getBlockCount');
console.log('区块数量:', blockCount);

// 创建钱包
const wallet = await window.rpc.call('createWallet');
console.log('新钱包:', wallet);

// 发送交易
const txHash = await window.rpc.call('sendTransaction', {
  from: 'cosmos1sender',
  to: 'cosmos1receiver',
  amount: '100'
});
console.log('交易哈希:', txHash);

// 开始挖矿
await window.rpc.call('startMining', {
  minerAddress: 'cosmos1miner'
});
```

### cURL示例

由于这是浏览器应用，不支持真正的HTTP请求，但可以使用以下格式：

```bash
# 模拟RPC请求格式
curl -X POST http://localhost:3001 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "getBlockCount",
    "id": 1
  }'
```

## 批量请求

支持在单个请求中执行多个RPC方法：

```javascript
const client = rpcServer.createClient();
const results = await client.batchCall([
  { method: 'getBlockCount' },
  { method: 'getChainInfo' },
  { method: 'getMiningInfo' }
]);
```

## 集成服务

集成服务提供了统一的接口来协调本地区块链和Cosmos网络：

```javascript
// 初始化集成服务
await integrationService.initialize();

// 获取统一余额（优先本地链，回退到Cosmos）
const balance = await integrationService.getUnifiedBalance('cosmos1abc123');

// 发送统一交易（自动选择最佳网络）
const result = await integrationService.sendUnifiedTransaction(
  'cosmos1sender',
  'cosmos1receiver',
  '100',
  'COSMOS'
);
```

## 监控和调试

### 服务器状态
```javascript
const status = rpcServer.getStatus();
console.log('服务器状态:', status);
```

### 服务器统计
```javascript
const stats = rpcServer.getStats();
console.log('请求统计:', stats);
```

### 浏览器控制台
可以在浏览器控制台中直接使用以下全局对象：
- `window.rpc` - RPC客户端
- `window.rpcService` - RPC服务
- `window.rpcServer` - RPC服务器
- `window.integrationService` - 集成服务
- `window.blockchain` - 区块链实例
- `window.cosmosService` - Cosmos服务

## 最佳实践

### 错误处理
```javascript
try {
  const result = await window.rpc.call('sendTransaction', params);
  console.log('交易成功:', result);
} catch (error) {
  console.error('交易失败:', error.message);
  
  // 根据错误代码处理
  if (error.message.includes('-32001')) {
    alert('余额不足');
  }
}
```

### 性能优化
1. 使用批量请求减少网络开销
2. 缓存不常变化的数据（如链信息）
3. 合理设置挖矿间隔避免CPU过载

### 安全考虑
1. 助记词仅在内存中处理，不持久化存储
2. 本地存储数据已加密
3. 交易签名在本地完成

## 扩展开发

### 添加新的RPC方法
1. 在`src/services/rpc.ts`中添加方法实现
2. 更新`RPCMethod`类型定义
3. 在`executeMethod`中添加案例处理
4. 添加相应的测试用例

### 自定义集成逻辑
可以扩展`IntegrationService`类来实现特定的业务逻辑，如自定义的数据同步策略或特殊的交易路由规则。

---

**注意**: 这是一个演示项目，生产环境使用需要额外的安全性和可靠性考虑。
