/**
 * RPC服务测试组件
 * 
 * 提供一个完整的RPC功能测试界面，验证所有服务是否正常工作
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  Error,
  Info,
  PlayArrow,
  Refresh
} from '@mui/icons-material';
import { rpcService } from '../services/rpc';
import { rpcServer } from '../services/rpcServer';
import { integrationService } from '../services/integration';

interface TestResult {
  method: string;
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

interface ServerStatus {
  isRunning: boolean;
  requestCount: number;
  recentRequests: any[];
}

export default function RPCTester() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [testWallet, setTestWallet] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 测试参数
  const [testParams, setTestParams] = useState({
    minerAddress: 'cosmos1test123',
    fromAddress: '',
    toAddress: 'cosmos1receiver',
    amount: '10',
    denom: 'COSMOS'
  });

  useEffect(() => {
    loadServerStatus();
    
    if (autoRefresh) {
      const interval = setInterval(loadServerStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadServerStatus = () => {
    try {
      const status = rpcServer.getStatus();
      setServerStatus(status);
    } catch (error) {
      console.error('获取服务器状态失败:', error);
    }
  };

  const runTest = async (method: string, params?: any): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      const result = await rpcService.call(method as any, params);
      const duration = Date.now() - startTime;
      
      return {
        method,
        success: true,
        result,
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        method,
        success: false,
        error: error.message,
        duration
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const tests = [
      // 基础查询测试
      { method: 'getBlockCount' },
      { method: 'getChainInfo' },
      { method: 'getNodeInfo' },
      
      // 区块和交易测试
      { method: 'getBlock', params: { height: 0 } },
      { method: 'getPendingTransactions' },
      
      // 账户测试
      { method: 'getBalance', params: { address: testParams.fromAddress || 'cosmos1genesis1' } },
      { method: 'getAccount', params: { address: testParams.fromAddress || 'cosmos1genesis1' } },
      
      // 挖矿测试
      { method: 'getMiningInfo' },
      
      // 钱包测试
      { method: 'createWallet' },
      
      // 系统测试
      { method: 'backup' }
    ];

    const results: TestResult[] = [];

    for (const test of tests) {
      const result = await runTest(test.method, test.params);
      results.push(result);
      setTestResults([...results]);
      
      // 如果是创建钱包测试成功，保存钱包信息
      if (test.method === 'createWallet' && result.success) {
        setTestWallet(result.result);
        setTestParams(prev => ({
          ...prev,
          fromAddress: result.result.address
        }));
      }
    }

    setIsRunning(false);
  };

  const runSingleTest = async (method: string, params?: any) => {
    const result = await runTest(method, params);
    setTestResults(prev => {
      const filtered = prev.filter(r => r.method !== method);
      return [...filtered, result];
    });
  };

  const sendTestTransaction = async () => {
    if (!testParams.fromAddress || !testParams.toAddress) {
      alert('请先设置发送方和接收方地址');
      return;
    }

    await runSingleTest('sendTransaction', {
      from: testParams.fromAddress,
      to: testParams.toAddress,
      amount: testParams.amount,
      denom: testParams.denom
    });
  };

  const startTestMining = async () => {
    await runSingleTest('startMining', { 
      minerAddress: testParams.minerAddress 
    });
  };

  const stopTestMining = async () => {
    await runSingleTest('stopMining');
  };

  const mineTestBlock = async () => {
    await runSingleTest('mine', { 
      minerAddress: testParams.minerAddress 
    });
  };

  const initializeIntegration = async () => {
    try {
      await integrationService.initialize();
      alert('集成服务初始化成功');
    } catch (error: any) {
      alert(`集成服务初始化失败: ${error.message}`);
    }
  };

  const getSuccessCount = () => testResults.filter(r => r.success).length;
  const getFailureCount = () => testResults.filter(r => !r.success).length;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        RPC服务测试面板
      </Typography>

      {/* 服务器状态 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            服务器状态
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              }
              label="自动刷新"
              sx={{ ml: 2 }}
            />
          </Typography>
          
          {serverStatus ? (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Box>
                <Chip
                  icon={serverStatus.isRunning ? <CheckCircle /> : <Error />}
                  label={serverStatus.isRunning ? '运行中' : '已停止'}
                  color={serverStatus.isRunning ? 'success' : 'error'}
                />
              </Box>
              <Box>
                <Typography variant="body2">
                  总请求数: {serverStatus.requestCount}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2">
                  最近请求: {serverStatus.recentRequests.length}
                </Typography>
              </Box>
              <Box>
                <Button
                  size="small"
                  startIcon={<Refresh />}
                  onClick={loadServerStatus}
                >
                  刷新
                </Button>
              </Box>
            </Box>
          ) : (
            <Alert severity="warning">无法获取服务器状态</Alert>
          )}
        </CardContent>
      </Card>

      {/* 测试参数配置 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            测试参数配置
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
            <Box>
              <TextField
                fullWidth
                label="矿工地址"
                value={testParams.minerAddress}
                onChange={(e) => setTestParams(prev => ({
                  ...prev,
                  minerAddress: e.target.value
                }))}
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="发送方地址"
                value={testParams.fromAddress}
                onChange={(e) => setTestParams(prev => ({
                  ...prev,
                  fromAddress: e.target.value
                }))}
                placeholder={testWallet?.address || '将通过创建钱包测试自动填充'}
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                label="接收方地址"
                value={testParams.toAddress}
                onChange={(e) => setTestParams(prev => ({
                  ...prev,
                  toAddress: e.target.value
                }))}
              />
            </Box>
            <Box sx={{ gridColumn: 'span 1' }}>
              <TextField
                fullWidth
                label="金额"
                value={testParams.amount}
                onChange={(e) => setTestParams(prev => ({
                  ...prev,
                  amount: e.target.value
                }))}
              />
            </Box>
            <Box sx={{ gridColumn: 'span 1' }}>
              <TextField
                fullWidth
                label="代币类型"
                value={testParams.denom}
                onChange={(e) => setTestParams(prev => ({
                  ...prev,
                  denom: e.target.value
                }))}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 快速操作 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            快速操作
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={runAllTests}
              disabled={isRunning}
            >
              运行所有测试
            </Button>
            <Button
              variant="outlined"
              onClick={initializeIntegration}
            >
              初始化集成服务
            </Button>
            <Button
              variant="outlined"
              onClick={sendTestTransaction}
              disabled={!testParams.fromAddress}
            >
              发送测试交易
            </Button>
            <Button
              variant="outlined"
              onClick={mineTestBlock}
            >
              挖矿测试
            </Button>
            <Button
              variant="outlined"
              color="success"
              onClick={startTestMining}
            >
              启动自动挖矿
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={stopTestMining}
            >
              停止挖矿
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 测试结果统计 */}
      {testResults.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              测试结果统计
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<CheckCircle />}
                label={`成功: ${getSuccessCount()}`}
                color="success"
              />
              <Chip
                icon={<Error />}
                label={`失败: ${getFailureCount()}`}
                color="error"
              />
              <Chip
                icon={<Info />}
                label={`总计: ${testResults.length}`}
                color="info"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 详细测试结果 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            详细测试结果
          </Typography>
          
          {testResults.length === 0 ? (
            <Alert severity="info">
              暂无测试结果。点击"运行所有测试"开始测试。
            </Alert>
          ) : (
            testResults.map((result, index) => (
              <Accordion key={index}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    {result.success ? (
                      <CheckCircle color="success" sx={{ mr: 1 }} />
                    ) : (
                      <Error color="error" sx={{ mr: 1 }} />
                    )}
                    <Typography sx={{ flexGrow: 1 }}>
                      {result.method}
                    </Typography>
                    <Chip
                      label={`${result.duration}ms`}
                      size="small"
                      sx={{ mr: 2 }}
                    />
                    <Chip
                      label={result.success ? '成功' : '失败'}
                      color={result.success ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {result.success ? (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        执行结果:
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          background: '#f5f5f5',
                          p: 2,
                          borderRadius: 1,
                          overflow: 'auto',
                          fontSize: '0.875rem'
                        }}
                      >
                        {JSON.stringify(result.result, null, 2)}
                      </Box>
                    </Box>
                  ) : (
                    <Alert severity="error">
                      错误信息: {result.error}
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </CardContent>
      </Card>

      {/* 创建的测试钱包信息 */}
      {testWallet && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              测试钱包信息
            </Typography>
            
            <List>
              <ListItem>
                <ListItemText
                  primary="地址"
                  secondary={testWallet.address}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="助记词"
                  secondary={
                    <Box
                      component="span"
                      sx={{
                        background: '#f5f5f5',
                        p: 1,
                        borderRadius: 1,
                        display: 'block',
                        mt: 1,
                        fontFamily: 'monospace'
                      }}
                    >
                      {testWallet.mnemonic}
                    </Box>
                  }
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
