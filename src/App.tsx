import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Tabs,
  Tab,
  ThemeProvider,
  createTheme,
  CssBaseline
} from '@mui/material';
import { AccountBalance } from '@mui/icons-material';
import WalletManager from './components/WalletManager';
import TokenTransfer from './components/TokenTransfer';
import TokenMint from './components/TokenMint';
import Mining from './components/Mining';
import BlockExplorer from './components/BlockExplorer';
import { Wallet } from './types';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleWalletSelect = (wallet: Wallet) => {
    setSelectedWallet(wallet);
  };

  const handleTransferComplete = () => {
    // 刷新钱包余额
    if (selectedWallet) {
      // 这里可以触发余额刷新
      console.log('Transfer completed, refreshing wallet balance...');
    }
  };

  const handleMintComplete = () => {
    console.log('Token mint completed');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <AccountBalance sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Cosmos 本地区块链应用
            </Typography>
            {selectedWallet && selectedWallet.address && (
              <Typography variant="body2" sx={{ ml: 2 }}>
                当前钱包: {selectedWallet.address.slice(0, 10)}...
              </Typography>
            )}
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="cosmos app tabs">
              <Tab label="钱包管理" />
              <Tab label="代币生产" />
              <Tab label="代币转账" />
              <Tab label="挖矿" />
              <Tab label="区块浏览器" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <WalletManager 
              onWalletSelect={handleWalletSelect}
              selectedWallet={selectedWallet}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <TokenMint 
              wallet={selectedWallet}
              onMintComplete={handleMintComplete}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <TokenTransfer 
              wallet={selectedWallet}
              onTransferComplete={handleTransferComplete}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Mining wallet={selectedWallet} />
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            <BlockExplorer />
          </TabPanel>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
