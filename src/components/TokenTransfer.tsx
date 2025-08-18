import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import { Send } from '@mui/icons-material';
import { cosmosService } from '../services/cosmos';
import { Wallet } from '../types';

interface TokenTransferProps {
  wallet: Wallet | null;
  onTransferComplete: () => void;
}

const TokenTransfer: React.FC<TokenTransferProps> = ({ wallet, onTransferComplete }) => {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedDenom, setSelectedDenom] = useState('uatom');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleTransfer = async () => {
    if (!wallet) {
      setError('请先选择钱包');
      return;
    }

    if (!toAddress || !amount) {
      setError('请填写所有必需字段');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('转账金额必须大于0');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const amountInMicroUnits = (parseFloat(amount) * 1000000).toString();
      
      const selectedToken = wallet.balance.find(token => token.denom === selectedDenom);
      if (!selectedToken || parseFloat(selectedToken.amount) < parseFloat(amountInMicroUnits)) {
        setError('余额不足');
        setLoading(false);
        return;
      }

      const txHash = await cosmosService.sendTokens(
        wallet.mnemonic,
        wallet.address,
        toAddress,
        amountInMicroUnits,
        selectedDenom
      );

      setSuccess(`转账成功！交易哈希: ${txHash}`);
      setToAddress('');
      setAmount('');
      onTransferComplete();
    } catch (err) {
      setError('转账失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!wallet) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            代币转账
          </Typography>
          <Alert severity="warning">
            请先选择一个钱包
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Send />
          代币转账
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          从钱包: {wallet?.address?.slice(0, 20)}...
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
            label="接收地址"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="输入接收方地址"
            disabled={loading}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="数量"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.000000"
              disabled={loading}
              sx={{ flex: 1 }}
              inputProps={{
                step: "0.000001",
                min: "0"
              }}
            />

            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>代币</InputLabel>
              <Select
                value={selectedDenom}
                onChange={(e) => setSelectedDenom(e.target.value)}
                label="代币"
                disabled={loading}
              >
                {wallet.balance.map((token) => (
                  <MenuItem key={token.denom} value={token.denom}>
                    {token.denom.replace('u', '').toUpperCase()}
                  </MenuItem>
                ))}
                {wallet.balance.length === 0 && (
                  <MenuItem value="uatom">ATOM</MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              可用余额:
            </Typography>
            {wallet.balance.map((token) => (
              <Typography
                key={token.denom}
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  color: token.denom === selectedDenom ? 'primary.main' : 'text.secondary'
                }}
              >
                {(parseFloat(token.amount) / 1000000).toFixed(6)} {token.denom.replace('u', '').toUpperCase()}
              </Typography>
            ))}
            {wallet.balance.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                无可用余额
              </Typography>
            )}
          </Box>

          <Button
            variant="contained"
            onClick={handleTransfer}
            disabled={loading || !toAddress || !amount || parseFloat(amount) <= 0}
            startIcon={loading ? <CircularProgress size={20} /> : <Send />}
            fullWidth
          >
            {loading ? '转账中...' : '发送转账'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TokenTransfer;