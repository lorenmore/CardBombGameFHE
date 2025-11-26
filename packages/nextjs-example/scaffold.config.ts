import * as chains from "viem/chains";

export type BaseConfig = {
  targetNetworks: readonly chains.Chain[];
  pollingInterval: number;
  alchemyApiKey: string;
  rpcOverrides?: Record<number, string>;
  walletConnectProjectId: string;
  onlyLocalBurnerWallet: boolean;
};

export type ScaffoldConfig = BaseConfig;

// Public RPC for Sepolia - no API key required
const SEPOLIA_PUBLIC_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

const scaffoldConfig = {
  // The networks on which your DApp is live
  targetNetworks: [chains.hardhat, chains.sepolia],
  // The interval at which your front-end polls the RPC servers for new data
  pollingInterval: 30000,
  // Alchemy API key (optional - uses public RPC if not set)
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "",
  // Use public RPC for Sepolia by default
  rpcOverrides: {
    [chains.sepolia.id]: SEPOLIA_PUBLIC_RPC,
  },
  // This is ours WalletConnect's default project ID.
  // You can get your own at https://cloud.walletconnect.com
  // It's recommended to store it in an env variable:
  // .env.local for local testing, and in the Vercel/system env config for live apps.
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64",
  onlyLocalBurnerWallet: true,
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
