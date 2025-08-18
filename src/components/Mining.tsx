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
  Paper
} from '@mui/material';
import { Construction, PlayArrow, Stop, TrendingUp } from '@mui/icons-material';
import { cosmosService } from '../services/cosmos';
import { Wallet, MiningReward } from '../types';

interface MiningProps {
  wallet: Wallet | null;
}

const Mining: React.FC<MiningProps> = ({ wallet }) => {
  const [isMining, setIsMining] = useState(false);
  const [miningProgress, setMiningProgress] = useState(0);
  const [rewards, setRewards] = useState<MiningReward[]>([]);
  const [totalRewards, setTotalRewards] = useState('0');
  const [validators, setValidators] = useState<any[]>([]);
  const [selectedValidator, setSelectedValidator] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadValidators();
    loadMiningHistory();
  }, []);

  const loadValidators = async () => {
    try {
      const validatorList = await cosmosService.getValidators();
      setValidators(validatorList.slice(0, 5)); // 显示前5个验证者
      if (validatorList.length > 0) {
        setSelectedValidator(validatorList[0].address);
      }
    } catch (err) {
      console.error('Failed to load validators:', err);
    }
  };

  const loadMiningHistory = () => {
    const stored = localStorage.getItem('mining-rewards');
    if (stored) {
      const storedRewards = JSON.parse(stored);
      setRewards(storedRewards);
      
      const total = storedRewards.reduce((sum: number, reward: MiningReward) => {
        return sum + parseFloat(reward.amount);
      }, 0);
      setTotalRewards(total.toFixed(6));
    }
  };

  const saveMiningHistory = (newRewards: MiningReward[]) => {
    localStorage.setItem('mining-rewards', JSON.stringify(newRewards));
    setRewards(newRewards);
    
    const total = newRewards.reduce((sum, reward) => {
      return sum + parseFloat(reward.amount);
    }, 0);
    setTotalRewards(total.toFixed(6));
  };

  const startMining = async () => {
    if (!wallet) {
      setError('请先选择钱包');
      return;
    }

    if (!selectedValidator) {
      setError('请选择验证者');
      return;
    }

    setIsMining(true);
    setError(null);
    setMiningProgress(0);

    // 模拟挖矿进度
    const progressInterval = setInterval(() => {
      setMiningProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    try {
      const rewardAmount = await cosmosService.simulateMining(selectedValidator);
      
      const newReward: MiningReward = {
        amount: rewardAmount,
        denom: 'uatom',
        blockHeight: Math.floor(Math.random() * 1000000) + 1000000,
        timestamp: new Date().toISOString()
      };

      const updatedRewards = [newReward, ...rewards].slice(0, 20); // 保留最近20条记录
      saveMiningHistory(updatedRewards);
      
      setMiningProgress(100);
      
      setTimeout(() => {
        setIsMining(false);
        setMiningProgress(0);
      }, 1000);
      
    } catch (err) {
      setError('挖矿失败: ' + (err as Error).message);
      setIsMining(false);
      setMiningProgress(0);
      clearInterval(progressInterval);
    }
  };

  const stopMining = () => {
    setIsMining(false);
    setMiningProgress(0);
  };

  if (!wallet) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            挖矿
          </Typography>
          <Alert severity="warning">
            请先选择一个钱包开始挖矿
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Construction />
        挖矿中心
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* 挖矿控制面板和统计 */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Card sx={{ flex: 1, minWidth: '400px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                挖矿控制
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                当前钱包: {wallet?.address?.slice(0, 20)}...
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  选择验证者:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {validators.map((validator, index) => (
                    <Chip
                      key={validator.address || index}
                      label={`验证者 ${index + 1}`}
                      onClick={() => setSelectedValidator(validator.address || `validator-${index}`)}
                      color={selectedValidator === (validator.address || `validator-${index}`) ? 'primary' : 'default'}
                      variant={selectedValidator === (validator.address || `validator-${index}`) ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Box>

              {isMining && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    挖矿进度: {miningProgress.toFixed(1)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={miningProgress}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={startMining}
                  disabled={isMining}
                  startIcon={<PlayArrow />}
                  fullWidth
                >
                  {isMining ? '挖矿中...' : '开始挖矿'}
                </Button>
                {isMining && (
                  <Button
                    variant="outlined"
                    onClick={stopMining}
                    startIcon={<Stop />}
                  >
                    停止
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* 挖矿统计 */}
          <Card sx={{ flex: 1, minWidth: '400px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp />
                挖矿统计
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  累计奖励
                </Typography>
                <Typography variant="h4" color="primary">
                  {totalRewards} ATOM
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  挖矿次数
                </Typography>
                <Typography variant="h5">
                  {rewards.length}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  平均每次奖励
                </Typography>
                <Typography variant="h5">
                  {rewards.length > 0 ? (parseFloat(totalRewards) / rewards.length).toFixed(6) : '0.000000'} ATOM
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* 挖矿历史 */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                挖矿历史
              </Typography>
              
              {rewards.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  暂无挖矿记录
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {rewards.map((reward, index) => (
                    <Paper
                      key={index}
                      elevation={1}
                      sx={{
                        p: 2,
                        mb: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          +{reward.amount} ATOM
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          区块高度: {reward.blockHeight}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(reward.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
      </Box>
    </Box>
  );
};

export default Mining;