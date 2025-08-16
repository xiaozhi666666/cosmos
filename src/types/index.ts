export interface Wallet {
  address: string;
  mnemonic: string;
  balance: TokenBalance[];
}

export interface TokenBalance {
  denom: string;
  amount: string;
}

export interface Block {
  height: number;
  hash: string;
  time: string;
  txCount: number;
  proposer?: string;
}

export interface Transaction {
  hash: string;
  height: number;
  from: string;
  to: string;
  amount: string;
  denom: string;
  fee: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
}

export interface Validator {
  address: string;
  moniker: string;
  votingPower: string;
  commission: string;
  status: string;
}

export interface MiningReward {
  amount: string;
  denom: string;
  blockHeight: number;
  timestamp: string;
}