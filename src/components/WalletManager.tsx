/**
 * 钱包管理组件
 * 
 * 这个组件提供完整的钱包管理功能，包括：
 * - 创建新钱包（生成助记词）
 * - 导入现有钱包（通过助记词）
 * - 显示钱包列表和余额
 * - 钱包选择功能
 * - 助记词显示/隐藏切换
 * - 本地存储钱包数据
 * 
 * 所有钱包数据都存储在localStorage中，刷新页面后仍然保留
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import { AccountBalanceWallet, Add, Visibility, VisibilityOff } from '@mui/icons-material';
import { cosmosService } from '../services/cosmos';
import { Wallet } from '../types';

/**
 * 钱包管理组件的属性接口
 */
interface WalletManagerProps {
  onWalletSelect: (wallet: Wallet) => void;  // 钱包选择回调函数
  selectedWallet: Wallet | null;             // 当前选中的钱包
}

const WalletManager: React.FC<WalletManagerProps> = ({ onWalletSelect, selectedWallet }) => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMnemonic, setShowMnemonic] = useState<{[key: string]: boolean}>({});

  // 从localStorage加载钱包列表
  useEffect(() => {
    const loadWallets = () => {
      try {
        const stored = localStorage.getItem('cosmos-wallets');
        if (stored) {
          const parsedWallets = JSON.parse(stored);
          setWallets(parsedWallets);
          console.log('已加载钱包列表:', parsedWallets.length, '个钱包');
        }
      } catch (error) {
        console.error('加载钱包列表失败:', error);
      }
    };
    
    loadWallets();
  }, []);

  const createNewWallet = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const walletInfo = await cosmosService.createWallet();
      const balance = await cosmosService.getBalance(walletInfo.address);
      
      const newWallet: Wallet = {
        address: walletInfo.address,
        mnemonic: walletInfo.mnemonic,
        balance: balance
      };
      
      const updatedWallets = [...wallets, newWallet];
      setWallets(updatedWallets);
      
      // 保存到localStorage
      localStorage.setItem('cosmos-wallets', JSON.stringify(updatedWallets));
      
      setCreateDialogOpen(false);
      onWalletSelect(newWallet);
    } catch (err) {
      setError('创建钱包失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const importWallet = async () => {
    if (!mnemonic.trim()) {
      setError('请输入有效的助记词');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const walletInfo = await cosmosService.importWallet(mnemonic.trim());
      const balance = await cosmosService.getBalance(walletInfo.address);
      
      const importedWallet: Wallet = {
        address: walletInfo.address,
        mnemonic: mnemonic.trim(),
        balance: balance
      };
      
      const updatedWallets = [...wallets, importedWallet];
      setWallets(updatedWallets);
      
      // 保存到localStorage
      localStorage.setItem('cosmos-wallets', JSON.stringify(updatedWallets));
      
      setImportDialogOpen(false);
      setMnemonic('');
      onWalletSelect(importedWallet);
    } catch (err) {
      setError('导入钱包失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async (wallet: Wallet) => {
    try {
      const balance = await cosmosService.getBalance(wallet.address);
      const updatedWallets = wallets.map(w => 
        w.address === wallet.address ? { ...w, balance } : w
      );
      setWallets(updatedWallets);
      
      // 保存到localStorage
      localStorage.setItem('cosmos-wallets', JSON.stringify(updatedWallets));
      
      if (selectedWallet?.address === wallet.address) {
        onWalletSelect({ ...wallet, balance });
      }
    } catch (err) {
      console.error('刷新余额失败:', err);
      setError('刷新余额失败: ' + (err as Error).message);
    }
  };

  const toggleMnemonicVisibility = (address: string) => {
    setShowMnemonic(prev => ({
      ...prev,
      [address]: !prev[address]
    }));
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountBalanceWallet />
        钱包管理
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          onClick={() => setCreateDialogOpen(true)}
          sx={{ mr: 1 }}
          startIcon={<Add />}
        >
          创建新钱包
        </Button>
        <Button
          variant="outlined"
          onClick={() => setImportDialogOpen(true)}
        >
          导入钱包
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {wallets.map((wallet) => (
          <Card 
            key={wallet.address}
            sx={{ 
              cursor: 'pointer',
              border: selectedWallet?.address === wallet.address ? 2 : 1,
              borderColor: selectedWallet?.address === wallet.address ? 'primary.main' : 'grey.300',
              maxWidth: '600px'
            }}
            onClick={() => onWalletSelect(wallet)}
          >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  钱包地址
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    mb: 2
                  }}
                >
                  {wallet.address}
                </Typography>

                <Typography variant="subtitle2" gutterBottom>
                  助记词:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace',
                      fontSize: '0.7rem',
                      flex: 1,
                      wordBreak: 'break-all'
                    }}
                  >
                    {showMnemonic[wallet.address] ? wallet.mnemonic : '••••••••••••••••••••••••'}
                  </Typography>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMnemonicVisibility(wallet.address);
                    }}
                  >
                    {showMnemonic[wallet.address] ? <VisibilityOff /> : <Visibility />}
                  </Button>
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  余额:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {wallet.balance.length > 0 ? (
                    wallet.balance.map((token) => (
                      <Chip
                        key={token.denom}
                        label={`${parseFloat(token.amount).toFixed(6)} ${token.denom}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      无余额
                    </Typography>
                  )}
                </Box>

                <Button
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshBalance(wallet);
                  }}
                >
                  刷新余额
                </Button>
              </CardContent>
            </Card>
        ))}
      </Box>

      {/* Create Wallet Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>创建新钱包</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            将为您生成一个新的钱包地址和助记词。请安全保存助记词，它是恢复钱包的唯一方式。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button 
            onClick={createNewWallet} 
            variant="contained"
            disabled={loading}
          >
            {loading ? '创建中...' : '创建钱包'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Wallet Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)}>
        <DialogTitle>导入钱包</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            输入您的助记词来导入现有钱包
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="输入助记词（用空格分隔）"
            value={mnemonic}
            onChange={(e) => setMnemonic(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setImportDialogOpen(false);
            setMnemonic('');
          }}>取消</Button>
          <Button 
            onClick={importWallet} 
            variant="contained"
            disabled={loading || !mnemonic.trim()}
          >
            {loading ? '导入中...' : '导入钱包'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WalletManager;