/**
 * 挖矿组件 - 本地区块链挖矿
 * 
 * 提供本地区块链的挖矿功能：
 * - 手动挖矿（单次挖矿）
 * - 自动挖矿（连续挖矿）
 * - 挖矿状态监控
 * - 矿工地址设置
 * - 挖矿收益显示
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  LinearProgress,
  Chip,
  TextField,
  Tab,
  Tabs,
  Switch,
  FormControlLabel
} from '@mui/material';
import { TrendingUp, PlayArrow } from '@mui/icons-material';
import { Wallet } from '../types';
import { RPCClient, rpcServer } from '../services/rpcServer';

// 创建RPC客户端实例
const rpcClient = new RPCClient(rpcServer);

interface MiningTabProps {
  wallet: Wallet | null;
  onBalanceUpdate?: () => void;
}

interface MiningInfo {
  difficulty: number;
  pendingTransactions: number;
  lastBlockTime: number;
  totalBlocks: number;
  networkHashRate: string;
}

interface AutoMiningStatus {
  active: boolean;
  pendingTx: number;
}

const MiningTab: React.FC<MiningTabProps> = ({ wallet, onBalanceUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [miningInfo, setMiningInfo] = useState<MiningInfo | null>(null);
  const [autoMiningStatus, setAutoMiningStatus] = useState<AutoMiningStatus>({ active: false, pendingTx: 0 });
  const [minerAddress, setMinerAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [minedBlocks, setMinedBlocks] = useState<any[]>([]);

  const loadMiningInfo = async () => {
    try {
      const info = await rpcClient.call('getMiningInfo', {});
      setMiningInfo(info);
    } catch (err) {
      console.error('获取挖矿信息失败:', err);
    }
  };

  const loadAutoMiningStatus = async () => {
    try {
      const info = await rpcClient.call('getMiningInfo', {});
      // 从挖矿信息中提取状态
      setAutoMiningStatus({ 
        active: info.autoMiningActive || false,
        pendingTx: info.pendingTransactions || 0 
      });
    } catch (err) {
      console.error('获取自动挖矿状态失败:', err);
      // 设置默认值
      setAutoMiningStatus({ active: false, pendingTx: 0 });
    }
  };

  useEffect(() => {
    loadMiningInfo();
    loadAutoMiningStatus();
    
    if (wallet) {
      setMinerAddress(wallet.address);
    }
    
    // 定期更新状态
    const interval = setInterval(() => {
      loadMiningInfo();
      loadAutoMiningStatus();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualMining = async () => {
    if (!minerAddress) {
      setError('请输入矿工地址');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await rpcClient.call('mine', { minerAddress });
      
      setSuccess(`🎉 挖矿成功！新区块: #${result.index}`);
      setMinedBlocks(prev => [result, ...prev.slice(0, 4)]); // 保留最近5个区块
      
      await loadMiningInfo();
      if (onBalanceUpdate) {
        onBalanceUpdate();
      }
    } catch (err: any) {
      setError(`挖矿失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMining = async (enable: boolean) => {
    if (!minerAddress) {
      setError('请输入矿工地址');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      if (enable) {
        await rpcClient.call('startMining', { minerAddress });
        setSuccess('🚀 自动挖矿已启动');
      } else {
        await rpcClient.call('stopMining', {});
        setSuccess('⏹️ 自动挖矿已停止');
      }
      
      await loadAutoMiningStatus();
    } catch (err: any) {
      setError(`操作失败: ${err.message}`);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrendingUp />
        本地区块链挖矿
      </Typography>

      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="手动挖矿" />
        <Tab label="自动挖矿" />
        <Tab label="挖矿统计" />
      </Tabs>

      {/* 错误和成功消息 */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* 矿工地址设置 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>矿工设置</Typography>
          <TextField
            fullWidth
            label="矿工地址"
            value={minerAddress}
            onChange={(e) => setMinerAddress(e.target.value)}
            placeholder="输入矿工地址（挖矿奖励将发送到此地址）"
            sx={{ mb: 2 }}
          />
          
          {wallet && (
            <Button
              variant="outlined"
              onClick={() => setMinerAddress(wallet.address)}
              disabled={minerAddress === wallet.address}
            >
              使用当前钱包地址
            </Button>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            💡 提示：矿工地址是接收挖矿奖励的钱包地址，通常使用您的钱包地址
          </Typography>
        </CardContent>
      </Card>

      {/* Tab 0: 手动挖矿 */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>手动挖矿</Typography>
            
            {miningInfo && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  当前挖矿信息
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  <Chip label={`难度: ${miningInfo.difficulty}`} />
                  <Chip label={`待处理交易: ${miningInfo.pendingTransactions}`} />
                  <Chip label={`总区块数: ${miningInfo.totalBlocks}`} />
                </Box>
              </Box>
            )}

            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrow />}
              onClick={handleManualMining}
              disabled={loading || !minerAddress}
              sx={{ mb: 2 }}
            >
              {loading ? '挖矿中...' : '开始挖矿'}
            </Button>

            {loading && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>挖矿进行中...</Typography>
                <LinearProgress />
              </Box>
            )}

            {/* 最近挖出的区块 */}
            {minedBlocks.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>最近挖出的区块</Typography>
                {minedBlocks.map((block, index) => (
                  <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">
                          区块 #{block.index} - 哈希: {block.hash?.substring(0, 20)}...
                        </Typography>
                        <Chip size="small" label={`${block.data?.length || 0} 笔交易`} />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 1: 自动挖矿 */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>自动挖矿</Typography>
            
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoMiningStatus.active}
                    onChange={(e) => handleAutoMining(e.target.checked)}
                    disabled={!minerAddress}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">
                      {autoMiningStatus.active ? '自动挖矿已启动' : '自动挖矿已停止'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      自动挖矿将每30秒检查一次，如果有待处理交易则自动挖矿
                    </Typography>
                  </Box>
                }
              />
            </Box>

            {autoMiningStatus.active && (
              <Alert severity="info" sx={{ mb: 2 }}>
                🔄 自动挖矿进行中... 当前待处理交易: {autoMiningStatus.pendingTx} 笔
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary">
              📌 自动挖矿说明：
              <br />• 自动挖矿会在有待处理交易时自动触发
              <br />• 每30秒检查一次交易池状态
              <br />• 挖矿奖励会自动发送到指定的矿工地址
              <br />• 您可以随时停止自动挖矿
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: 挖矿统计 */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>挖矿统计</Typography>
            
            {miningInfo && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>当前难度</Typography>
                    <Typography variant="h5">{miningInfo.difficulty}</Typography>
                  </CardContent>
                </Card>
                
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>总区块数</Typography>
                    <Typography variant="h5">{miningInfo.totalBlocks}</Typography>
                  </CardContent>
                </Card>
                
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>待处理交易</Typography>
                    <Typography variant="h5">{miningInfo.pendingTransactions}</Typography>
                  </CardContent>
                </Card>
                
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>自动挖矿状态</Typography>
                    <Typography variant="h5">
                      {autoMiningStatus.active ? '🟢 运行中' : '🔴 已停止'}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MiningTab;
