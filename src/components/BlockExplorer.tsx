import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  TextField,
  Paper,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Search, Refresh, ViewList, TrendingUp } from '@mui/icons-material';
import { cosmosService } from '../services/cosmos';
import { Block } from '../types';

const BlockExplorer: React.FC = () => {
  const [latestBlock, setLatestBlock] = useState<Block | null>(null);
  const [searchHeight, setSearchHeight] = useState('');
  const [searchedBlock, setSearchedBlock] = useState<Block | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<Block[]>([]);
  const [chainId, setChainId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLatestBlock();
    loadChainInfo();
  }, []);

  const loadChainInfo = async () => {
    try {
      const id = await cosmosService.getChainId();
      setChainId(id);
    } catch (err) {
      console.error('Failed to load chain info:', err);
    }
  };

  const loadLatestBlock = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const block = await cosmosService.getLatestBlock();
      setLatestBlock(block);
      
      // 加载最近的几个区块
      const blocks: Block[] = [];
      for (let i = 0; i < 10; i++) {
        if (block.height - i > 0) {
          try {
            const recentBlock = await cosmosService.getBlockByHeight(block.height - i);
            blocks.push(recentBlock);
          } catch (err) {
            console.error(`Failed to load block ${block.height - i}:`, err);
          }
        }
      }
      setRecentBlocks(blocks);
    } catch (err) {
      console.error('获取最新区块失败:', err);
      setError('网络连接失败，正在尝试其他节点...');
      // 稍后重试
      setTimeout(() => {
        loadLatestBlock();
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const searchBlockByHeight = async () => {
    if (!searchHeight) {
      setError('请输入区块高度');
      return;
    }

    const height = parseInt(searchHeight);
    if (isNaN(height) || height <= 0) {
      setError('请输入有效的区块高度');
      return;
    }

    setSearchLoading(true);
    setError(null);
    
    try {
      const block = await cosmosService.getBlockByHeight(height);
      setSearchedBlock(block);
    } catch (err) {
      setError('Failed to find block: ' + (err as Error).message);
      setSearchedBlock(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const BlockCard: React.FC<{ block: Block; title: string }> = ({ block, title }) => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: '200px' }}>
              <Typography variant="body2" color="text.secondary">
                区块高度
              </Typography>
              <Typography variant="h5" color="primary">
                {block.height.toLocaleString()}
              </Typography>
            </Box>
            
            <Box sx={{ flex: 1, minWidth: '200px' }}>
              <Typography variant="body2" color="text.secondary">
                交易数量
              </Typography>
              <Typography variant="h5">
                {block.txCount}
              </Typography>
            </Box>
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              区块哈希
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                fontSize: '0.8rem'
              }}
            >
              {block.hash}
            </Typography>
          </Box>
          
          <Box>
            <Typography variant="body2" color="text.secondary">
              时间戳
            </Typography>
            <Typography variant="body1">
              {formatTimestamp(block.time)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ViewList />
        区块链浏览器
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 链信息 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp />
            链信息
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: '200px' }}>
              <Typography variant="body2" color="text.secondary">
                链ID
              </Typography>
              <Typography variant="h6">
                {chainId || '加载中...'}
              </Typography>
            </Box>
            
            <Box sx={{ flex: 1, minWidth: '200px' }}>
              <Typography variant="body2" color="text.secondary">
                最新区块高度
              </Typography>
              <Typography variant="h6">
                {latestBlock ? latestBlock.height.toLocaleString() : '加载中...'}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={loadLatestBlock}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
            >
              {loading ? '刷新中...' : '刷新数据'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 区块搜索 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            搜索区块
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="区块高度"
              type="number"
              value={searchHeight}
              onChange={(e) => setSearchHeight(e.target.value)}
              placeholder="输入区块高度"
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              onClick={searchBlockByHeight}
              disabled={searchLoading}
              startIcon={searchLoading ? <CircularProgress size={20} /> : <Search />}
            >
              搜索
            </Button>
          </Box>
          
          {searchedBlock && (
            <BlockCard block={searchedBlock} title="搜索结果" />
          )}
        </CardContent>
      </Card>

      {/* 最新区块 */}
      {latestBlock && (
        <Box sx={{ mb: 3 }}>
          <BlockCard block={latestBlock} title="最新区块" />
        </Box>
      )}

      {/* 最近区块列表 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            最近区块
          </Typography>
          
          {recentBlocks.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              正在加载区块数据...
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>高度</TableCell>
                    <TableCell>哈希</TableCell>
                    <TableCell>交易数</TableCell>
                    <TableCell>时间</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentBlocks.map((block) => (
                    <TableRow key={block.height}>
                      <TableCell>
                        <Chip 
                          label={block.height.toLocaleString()} 
                          color="primary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            fontSize: '0.75rem'
                          }}
                        >
                          {block.hash.slice(0, 20)}...
                        </Typography>
                      </TableCell>
                      <TableCell>{block.txCount}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatTimestamp(block.time)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default BlockExplorer;