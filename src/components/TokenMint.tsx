/**
 * 代币水龙头组件 - RPC版本
 * 
 * 这个组件提供真实的Cosmos测试网代币申请说明，不使用本地缓存：
 * - 显示测试网代币信息
 * - 提供官方水龙头链接
 * - 实时从RPC获取余额信息
 * 
 * 在真实的Cosmos网络中，代币需要从官方水龙头或其他用户获取
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { Water, OpenInNew, Refresh } from '@mui/icons-material';
import { Wallet } from '../types';
import { cosmosService } from '../services/cosmos';

interface TokenFaucetProps {
  wallet: Wallet | null;
  onBalanceUpdate: () => void;
  onMintComplete?: () => void;
}

interface FaucetInfo {
  denom: string;
  name: string;
  description: string;
  officialFaucet: string;
  testAmount: string;
}

const TokenFaucet: React.FC<TokenFaucetProps> = ({ wallet, onBalanceUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<any[]>([]);

  // 真实的Cosmos测试网信息
  const faucetInfo: FaucetInfo[] = [
    {
      denom: 'uatom',
      name: 'ATOM',
      description: 'Cosmos Hub 主网代币',
      officialFaucet: 'https://faucet.cosmos.network/',
      testAmount: '需要从官方水龙头获取'
    },
    {
      denom: 'uosmo',
      name: 'OSMO', 
      description: 'Osmosis 测试网代币',
      officialFaucet: 'https://faucet.osmosis.zone/',
      testAmount: '需要从Osmosis水龙头获取'
    }
  ];

  const refreshBalance = async () => {
    if (!wallet) {
      setError('请先选择钱包');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const balanceData = await cosmosService.getBalance(wallet.address);
      setBalance(balanceData);
      onBalanceUpdate(); // 通知父组件更新
    } catch (err) {
      setError('获取余额失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const openFaucet = (url: string) => {
    window.open(url, '_blank');
  };

  if (!wallet) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            测试网代币水龙头
          </Typography>
          <Alert severity="warning">
            请先选择一个钱包
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Water />
        Cosmos测试网代币水龙头
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* 当前钱包信息 */}
        <Alert severity="info">
          当前钱包: {wallet.address}
        </Alert>

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        {/* 当前余额 */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                当前余额
              </Typography>
              <Button
                variant="outlined"
                onClick={refreshBalance}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
              >
                {loading ? '刷新中...' : '刷新余额'}
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {balance.length > 0 ? (
                balance.map((token) => (
                  <Chip
                    key={token.denom}
                    label={`${(parseFloat(token.amount) / 1000000).toFixed(6)} ${token.denom.replace('u', '').toUpperCase()}`}
                    color="primary"
                    variant="outlined"
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  暂无余额 - 请从下方水龙头获取测试代币
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* 官方水龙头信息 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              官方测试网水龙头
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              由于这是连接到真实Cosmos网络的应用，需要从官方水龙头获取测试代币
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
              {faucetInfo.map((info) => (
                <Card variant="outlined" sx={{ height: '100%' }} key={info.denom}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6">
                        {info.name}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={info.denom}
                        color="secondary" 
                        variant="outlined" 
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {info.description}
                    </Typography>
                    
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      <strong>获取方式:</strong> {info.testAmount}
                    </Typography>

                    <Button
                      variant="contained"
                      onClick={() => openFaucet(info.officialFaucet)}
                      fullWidth
                      startIcon={<OpenInNew />}
                    >
                      访问官方水龙头
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* 说明信息 */}
        <Alert severity="info">
          <Typography variant="body2">
            <strong>说明:</strong> 本应用连接到真实的Cosmos网络，不提供模拟代币。
            请通过官方水龙头获取测试代币后，使用"刷新余额"按钮查看最新余额。
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default TokenFaucet;