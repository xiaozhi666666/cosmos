/**
 * Cosmos 本地区块链应用的主组件
 * 
 * 这个组件是整个应用的根组件，负责：
 * - 管理全局状态（选中的钱包）
 * - 提供导航和页面布局
 * - 协调各个功能模块之间的交互
 * 
 * 主要功能模块包括：
 * - 钱包管理：创建、导入、查看钱包
 * - 代币生产：铸造自定义代币
 * - 代币转账：在钱包间转移代币
 * - 挖矿：模拟区块链挖矿过程
 * - 区块浏览器：查看区块和交易信息
 */

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

// Material-UI 主题配置
// 定义应用的整体视觉风格和颜色方案
const theme = createTheme({
  palette: {
    mode: 'light', // 亮色主题
    primary: {
      main: '#1976d2', // 主色调：蓝色
    },
    secondary: {
      main: '#dc004e', // 次要色调：粉红色
    },
  },
});

/**
 * 标签页面板组件的属性接口
 */
interface TabPanelProps {
  children?: React.ReactNode; // 面板内容
  index: number;              // 面板索引
  value: number;              // 当前激活的标签索引
}

/**
 * 标签页面板组件
 * 用于控制不同功能模块的显示和隐藏
 * 
 * @param props - 组件属性
 * @returns 标签页面板元素
 */
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

/**
 * 应用主组件
 * 管理全局状态和协调各个功能模块
 * 
 * @returns 应用的完整UI结构
 */
function App() {
  // 当前选中的钱包状态，用于在不同模块间共享钱包信息
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  // 当前激活的标签页索引
  const [tabValue, setTabValue] = useState(0);

  /**
   * 处理标签页切换事件
   * @param _ - 事件对象（未使用）
   * @param newValue - 新的标签索引
   */
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  /**
   * 处理钱包选择事件
   * 当用户在钱包管理页面选择钱包时调用
   * @param wallet - 被选中的钱包对象
   */
  const handleWalletSelect = (wallet: Wallet) => {
    setSelectedWallet(wallet);
  };

  /**
   * 处理转账完成事件
   * 转账成功后可以在这里执行相关操作，如刷新余额
   */
  const handleTransferComplete = () => {
    // 刷新钱包余额
    if (selectedWallet) {
      // 这里可以触发余额刷新
      console.log('Transfer completed, refreshing wallet balance...');
    }
  };

  /**
   * 处理代币铸造完成事件
   * 铸造成功后的回调处理
   */
  const handleMintComplete = () => {
    console.log('Token mint completed');
  };

  return (
    // 应用主题提供器，为整个应用提供统一的样式主题
    <ThemeProvider theme={theme}>
      {/* CSS基线重置，确保跨浏览器的一致性 */}
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        {/* 顶部导航栏 */}
        <AppBar position="static">
          <Toolbar>
            {/* 应用图标 */}
            <AccountBalance sx={{ mr: 2 }} />
            {/* 应用标题 */}
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Cosmos 本地区块链应用
            </Typography>
            {/* 当前选中钱包的地址显示（如果有的话） */}
            {selectedWallet && selectedWallet.address && (
              <Typography variant="body2" sx={{ ml: 2 }}>
                当前钱包: {selectedWallet.address.slice(0, 10)}...
              </Typography>
            )}
          </Toolbar>
        </AppBar>

        {/* 主要内容区域 */}
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          {/* 功能标签页导航 */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="cosmos app tabs">
              <Tab label="钱包管理" />
              <Tab label="代币生产" />
              <Tab label="代币转账" />
              <Tab label="挖矿" />
              <Tab label="区块浏览器" />
            </Tabs>
          </Box>

          {/* 钱包管理页面 */}
          <TabPanel value={tabValue} index={0}>
            <WalletManager 
              onWalletSelect={handleWalletSelect}
              selectedWallet={selectedWallet}
            />
          </TabPanel>

          {/* 代币铸造页面 */}
          <TabPanel value={tabValue} index={1}>
            <TokenMint 
              wallet={selectedWallet}
              onMintComplete={handleMintComplete}
            />
          </TabPanel>

          {/* 代币转账页面 */}
          <TabPanel value={tabValue} index={2}>
            <TokenTransfer 
              wallet={selectedWallet}
              onTransferComplete={handleTransferComplete}
            />
          </TabPanel>

          {/* 挖矿页面 */}
          <TabPanel value={tabValue} index={3}>
            <Mining wallet={selectedWallet} />
          </TabPanel>

          {/* 区块浏览器页面 */}
          <TabPanel value={tabValue} index={4}>
            <BlockExplorer />
          </TabPanel>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
