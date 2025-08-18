/**
 * Cosmos 本地区块链应用的入口文件
 * 
 * 这是一个React应用程序，模拟Cosmos区块链的功能，包括：
 * - 钱包管理
 * - 代币铸造和转账
 * - 挖矿模拟
 * - 区块浏览器
 * 
 * @author Cosmos Team
 * @version 1.0.0
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// 创建React应用的根节点
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// 渲染应用主组件，使用严格模式进行开发时的额外检查
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
