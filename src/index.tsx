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
import reportWebVitals from './reportWebVitals';

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

// 性能监控工具，用于测量和报告应用性能指标
// 如果需要启用性能监控，可以传入回调函数处理结果
// 了解更多: https://bit.ly/CRA-vitals
reportWebVitals();
