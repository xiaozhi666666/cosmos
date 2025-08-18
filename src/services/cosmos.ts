import { StargateClient, SigningStargateClient } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { GasPrice } from '@cosmjs/stargate';

export interface WalletInfo {
  address: string;
  mnemonic: string;
  publicKey: Uint8Array;
}

export interface TokenInfo {
  denom: string;
  amount: string;
}

export interface BlockInfo {
  height: number;
  hash: string;
  time: string;
  txCount: number;
}

export interface TransactionInfo {
  hash: string;
  height: number;
  from: string;
  to: string;
  amount: string;
  fee: string;
  status: string;
}

export class CosmosService {
  private client: StargateClient | null = null;
  private signingClient: SigningStargateClient | null = null;
  private wallet: DirectSecp256k1HdWallet | null = null;
  private useLocalChain: boolean = true; // 使用本地模拟链

  constructor() {
    // 启动本地区块链
    if (this.useLocalChain) {
      // 延迟导入以避免循环依赖
      import('./mockBlockchain').then(({ mockBlockchain }) => {
        mockBlockchain.startBlockGeneration();
        console.log('本地模拟区块链已启动');
      });
    }
  }

  async connect(): Promise<void> {
    if (this.useLocalChain) {
      console.log('使用本地模拟区块链，无需连接外部网络');
      return;
    }
    
    // 在本地模式下不需要网络连接
    console.log('本地模拟模式已启用，跳过网络连接');
  }

  async createWallet(): Promise<WalletInfo> {
    try {
      const wallet = await DirectSecp256k1HdWallet.generate(24);
      const accounts = await wallet.getAccounts();
      
      if (!accounts || accounts.length === 0) {
        throw new Error('Failed to generate wallet accounts');
      }
      
      const [account] = accounts;
      
      if (!account || !account.address) {
        throw new Error('Failed to get wallet address from account');
      }
      
      return {
        address: account.address,
        mnemonic: wallet.mnemonic,
        publicKey: account.pubkey
      };
    } catch (error) {
      console.error('Failed to create wallet:', error);
      throw error;
    }
  }

  async importWallet(mnemonic: string): Promise<WalletInfo> {
    try {
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
      const accounts = await wallet.getAccounts();
      
      if (!accounts || accounts.length === 0) {
        throw new Error('Failed to import wallet accounts');
      }
      
      const [account] = accounts;
      
      if (!account || !account.address) {
        throw new Error('Failed to get wallet address from imported account');
      }
      
      this.wallet = wallet;
      
      return {
        address: account.address,
        mnemonic: mnemonic,
        publicKey: account.pubkey
      };
    } catch (error) {
      console.error('Failed to import wallet:', error);
      throw error;
    }
  }

  async getSigningClient(mnemonic: string): Promise<SigningStargateClient> {
    try {
      if (this.useLocalChain) {
        // 在本地模式下，不需要真实的 signing client
        throw new Error('本地模式不支持真实的签名客户端');
      }

      if (!this.wallet) {
        this.wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
      }
      
      // 这里需要网络连接，但在本地模式下不会执行到
      throw new Error('网络模式已禁用');
    } catch (error) {
      console.error('Failed to get signing client:', error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<TokenInfo[]> {
    try {
      if (this.useLocalChain) {
        const { mockBlockchain } = await import('./mockBlockchain');
        const balance = mockBlockchain.getAccountBalance(address);
        return balance.map((coin: any) => ({
          denom: coin.denom,
          amount: coin.amount
        }));
      }

      if (!this.client) {
        await this.connect();
      }
      
      const balance = await this.client!.getAllBalances(address);
      return balance.map(coin => ({
        denom: coin.denom,
        amount: coin.amount
      }));
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  async sendTokens(
    mnemonic: string,
    fromAddress: string,
    toAddress: string,
    amount: string,
    denom: string = 'stake'
  ): Promise<string> {
    try {
      if (this.useLocalChain) {
        // 模拟转账交易
        const { mockBlockchain } = await import('./mockBlockchain');
        const txHash = mockBlockchain.addTransaction({
          from: fromAddress,
          to: toAddress,
          amount,
          denom,
          fee: '0.001'
        });
        
        console.log(`本地转账已提交: ${txHash}`);
        return txHash;
      }

      const signingClient = await this.getSigningClient(mnemonic);
      
      const fee = {
        amount: [{ denom: 'uatom', amount: '5000' }],
        gas: '200000',
      };

      const result = await signingClient.sendTokens(
        fromAddress,
        toAddress,
        [{ denom, amount }],
        fee,
        'Token transfer'
      );

      return result.transactionHash;
    } catch (error) {
      console.error('Failed to send tokens:', error);
      throw error;
    }
  }

  async getLatestBlock(): Promise<BlockInfo> {
    try {
      if (this.useLocalChain) {
        const { mockBlockchain } = await import('./mockBlockchain');
        const block = mockBlockchain.getLatestBlock();
        return {
          height: block.height,
          hash: block.hash,
          time: block.timestamp,
          txCount: block.transactions.length
        };
      }

      if (!this.client) {
        await this.connect();
      }

      const latestBlock = await this.client!.getBlock();
      
      return {
        height: latestBlock.header.height,
        hash: latestBlock.id,
        time: new Date(latestBlock.header.time).toISOString(),
        txCount: latestBlock.txs.length
      };
    } catch (error) {
      console.error('Failed to get latest block:', error);
      throw error;
    }
  }

  async getBlockByHeight(height: number): Promise<BlockInfo> {
    try {
      if (this.useLocalChain) {
        const { mockBlockchain } = await import('./mockBlockchain');
        const block = mockBlockchain.getBlockByHeight(height);
        if (!block) {
          throw new Error(`区块 #${height} 未找到`);
        }
        return {
          height: block.height,
          hash: block.hash,
          time: block.timestamp,
          txCount: block.transactions.length
        };
      }

      if (!this.client) {
        await this.connect();
      }

      const block = await this.client!.getBlock(height);
      
      return {
        height: block.header.height,
        hash: block.id,
        time: new Date(block.header.time).toISOString(),
        txCount: block.txs.length
      };
    } catch (error) {
      console.error('Failed to get block by height:', error);
      throw error;
    }
  }

  async getChainId(): Promise<string> {
    try {
      if (this.useLocalChain) {
        const { mockBlockchain } = await import('./mockBlockchain');
        return mockBlockchain.getChainInfo().chainId;
      }

      if (!this.client) {
        await this.connect();
      }
      
      return await this.client!.getChainId();
    } catch (error) {
      console.error('Failed to get chain ID:', error);
      throw error;
    }
  }

  async getValidators(): Promise<any[]> {
    try {
      if (this.useLocalChain) {
        const { mockBlockchain } = await import('./mockBlockchain');
        return mockBlockchain.getValidators();
      }

      // 网络模式已禁用
      throw new Error('网络模式已禁用');
    } catch (error) {
      console.error('获取验证者失败:', error);
      throw error;
    }
  }

  async simulateMining(validatorAddress: string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        if (this.useLocalChain) {
          const { mockBlockchain } = await import('./mockBlockchain');
          const reward = mockBlockchain.simulateMining(validatorAddress);
          resolve(reward.toFixed(6));
        } else {
          const reward = (Math.random() * 10 + 1).toFixed(6);
          resolve(reward);
        }
      }, 2000);
    });
  }
}

export const cosmosService = new CosmosService();