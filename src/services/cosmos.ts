import { StargateClient, SigningStargateClient } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { GasPrice } from '@cosmjs/stargate';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';

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
  private rpcEndpoint: string;
  private backupEndpoints: string[] = [
    'https://cosmos-rpc.polkachu.com',
    'https://rpc.cosmos.network:443',
    'https://cosmos-rpc.publicnode.com:443',
    'https://rpc-cosmoshub.blockapsis.com',
    'https://cosmos-rpc.staketab.org:443'
  ];

  constructor(rpcEndpoint?: string) {
    this.rpcEndpoint = rpcEndpoint || this.backupEndpoints[0];
  }

  async connect(): Promise<void> {
    let lastError: any = null;
    
    for (const endpoint of this.backupEndpoints) {
      try {
        console.log(`尝试连接到: ${endpoint}`);
        this.client = await StargateClient.connect(endpoint);
        this.rpcEndpoint = endpoint;
        console.log(`成功连接到: ${endpoint}`);
        return;
      } catch (error) {
        console.warn(`连接失败 ${endpoint}:`, error);
        lastError = error;
        continue;
      }
    }
    
    console.error('所有 RPC 端点连接失败');
    throw lastError || new Error('所有 RPC 端点都无法连接');
  }

  async createWallet(): Promise<WalletInfo> {
    try {
      const wallet = await DirectSecp256k1HdWallet.generate(24);
      const [account] = await wallet.getAccounts();
      
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
      const [account] = await wallet.getAccounts();
      
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
      if (!this.wallet) {
        this.wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
      }
      
      this.signingClient = await SigningStargateClient.connectWithSigner(
        this.rpcEndpoint,
        this.wallet,
        {
          gasPrice: GasPrice.fromString('0.025uatom'),
        }
      );
      
      return this.signingClient;
    } catch (error) {
      console.error('Failed to get signing client:', error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<TokenInfo[]> {
    try {
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
    denom: string = 'uatom'
  ): Promise<string> {
    try {
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
      // 确保先连接到可用的RPC端点
      if (!this.client) {
        await this.connect();
      }
      
      const tmClient = await Tendermint34Client.connect(this.rpcEndpoint);
      const validators = await tmClient.validatorsAll();
      return [...validators.validators];
    } catch (error) {
      console.error('获取验证者失败:', error);
      throw error;
    }
  }

  async simulateMining(_validatorAddress: string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const reward = (Math.random() * 10 + 1).toFixed(6);
        resolve(reward);
      }, 2000);
    });
  }
}

export const cosmosService = new CosmosService();