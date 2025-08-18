import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import { AccountBalance, Add } from '@mui/icons-material';
import { Wallet } from '../types';

interface TokenMintProps {
  wallet: Wallet | null;
  onMintComplete: () => void;
}

interface MintedToken {
  name: string;
  symbol: string;
  amount: string;
  timestamp: string;
  txHash: string;
}

const TokenMint: React.FC<TokenMintProps> = ({ wallet, onMintComplete }) => {
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mintedTokens, setMintedTokens] = useState<MintedToken[]>([]);

  React.useEffect(() => {
    loadMintHistory();
  }, []);

  const loadMintHistory = () => {
    const stored = localStorage.getItem('minted-tokens');
    if (stored) {
      setMintedTokens(JSON.parse(stored));
    }
  };

  const saveMintHistory = (tokens: MintedToken[]) => {
    localStorage.setItem('minted-tokens', JSON.stringify(tokens));
    setMintedTokens(tokens);
  };

  const generateTxHash = () => {
    return Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('').toUpperCase();
  };

  const handleMint = async () => {
    if (!wallet) {
      setError('请先选择钱包');
      return;
    }

    if (!tokenName || !tokenSymbol || !mintAmount) {
      setError('请填写所有字段');
      return;
    }

    if (parseFloat(mintAmount) <= 0) {
      setError('铸造数量必须大于0');
      return;
    }

    if (tokenSymbol.length < 2 || tokenSymbol.length > 10) {
      setError('代币符号长度应在2-10字符之间');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 模拟代币铸造过程
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newToken: MintedToken = {
        name: tokenName,
        symbol: tokenSymbol.toUpperCase(),
        amount: mintAmount,
        timestamp: new Date().toISOString(),
        txHash: generateTxHash()
      };

      const updatedTokens = [newToken, ...mintedTokens].slice(0, 50); // 保留最近50条记录
      saveMintHistory(updatedTokens);

      setSuccess(`成功铸造 ${mintAmount} ${tokenSymbol.toUpperCase()} 代币！`);
      setTokenName('');
      setTokenSymbol('');
      setMintAmount('');
      onMintComplete();
    } catch (err) {
      setError('代币铸造失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const predefinedTokens = [
    { name: 'Custom Token A', symbol: 'CTA' },
    { name: 'Custom Token B', symbol: 'CTB' },
    { name: 'Test Token', symbol: 'TEST' },
    { name: 'Demo Coin', symbol: 'DEMO' }
  ];

  const selectPredefinedToken = (token: { name: string; symbol: string }) => {
    setTokenName(token.name);
    setTokenSymbol(token.symbol);
  };

  if (!wallet) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            代币生产
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
        <AccountBalance />
        代币生产中心
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* 铸造表单和快速选择 */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Card sx={{ flex: 1, minWidth: '400px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                铸造新代币
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                铸造钱包: {wallet?.address?.slice(0, 20)}...
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {success}
                </Alert>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="代币名称"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="例如: My Custom Token"
                  disabled={loading}
                />

                <TextField
                  fullWidth
                  label="代币符号"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                  placeholder="例如: MCT"
                  disabled={loading}
                  slotProps={{ 
                    htmlInput: { maxLength: 10 }
                  }}
                />

                <TextField
                  fullWidth
                  label="铸造数量"
                  type="number"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="1000000"
                  disabled={loading}
                  slotProps={{
                    htmlInput: {
                      step: "1",
                      min: "1"
                    }
                  }}
                />

                <Button
                  variant="contained"
                  onClick={handleMint}
                  disabled={loading || !tokenName || !tokenSymbol || !mintAmount}
                  startIcon={loading ? <CircularProgress size={20} /> : <Add />}
                  fullWidth
                >
                  {loading ? '铸造中...' : '铸造代币'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* 快速选择 */}
          <Card sx={{ flex: 1, minWidth: '400px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                快速选择
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                选择预定义的代币模板
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {predefinedTokens.map((token, index) => (
                  <Paper
                    key={index}
                    elevation={1}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                    onClick={() => selectPredefinedToken(token)}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      {token.name} ({token.symbol})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      点击选择此代币模板
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* 铸造历史 */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                铸造历史
              </Typography>
              
              {mintedTokens.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  暂无铸造记录
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {mintedTokens.map((token, index) => (
                    <Paper
                      key={index}
                      elevation={1}
                      sx={{ p: 2, mb: 1 }}
                    >
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                        <Box sx={{ flex: 1, minWidth: '200px' }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {token.name} ({token.symbol})
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: '150px' }}>
                          <Typography variant="body2">
                            数量: {parseFloat(token.amount).toLocaleString()}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: '200px' }}>
                          <Typography variant="caption" color="text.secondary">
                            交易哈希: {token.txHash.slice(0, 16)}...
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: '150px' }}>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(token.timestamp).toLocaleString()}
                          </Typography>
                        </Box>
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

export default TokenMint;