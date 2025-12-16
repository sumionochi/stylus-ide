import { defineChain, type Chain } from "viem";

// XAI Sepolia (Gaming-focused Orbit chain)
export const xaiSepolia = defineChain({
  id: 37714555429,
  name: "XAI Sepolia",
  network: "xai-sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "XAI",
    symbol: "XAI",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-v2.xai.games/rpc"],
    },
    public: {
      http: ["https://testnet-v2.xai.games/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "XAI Explorer",
      url: "https://testnet-explorer-v2.xai.games",
    },
  },
  testnet: true,
});

// Rari Chain Testnet (Creator-focused Orbit chain)
export const rariTestnet = defineChain({
  id: 1918988905,
  name: "Rari Testnet",
  network: "rari-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet.rpc.rarichain.org/http"],
    },
    public: {
      http: ["https://testnet.rpc.rarichain.org/http"],
    },
  },
  blockExplorers: {
    default: {
      name: "Rari Explorer",
      url: "https://testnet.explorer.rarichain.org",
    },
  },
  testnet: true,
});

// Sanko Testnet (DeFi-focused Orbit chain)
export const sankoTestnet = defineChain({
  id: 1996,
  name: "Sanko Testnet",
  network: "sanko-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "DMT",
    symbol: "DMT",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet.sanko.xyz"],
    },
    public: {
      http: ["https://testnet.sanko.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Sanko Explorer",
      url: "https://testnet-explorer.sanko.xyz",
    },
  },
  testnet: true,
});

export interface OrbitChainInfo {
  id: number;
  name: string;
  chain: Chain;
  focus: string;
  description: string;
  gasToken: string;
  benefits: string[];
  mlContractAddress?: string;
  recommended?: boolean;
}

export const orbitChains: OrbitChainInfo[] = [
  {
    id: xaiSepolia.id,
    name: "XAI Sepolia",
    chain: xaiSepolia,
    focus: "Gaming & AI",
    description: "Optimized for gaming applications with ML inference",
    gasToken: "XAI",
    benefits: [
      "Lower gas costs for frequent predictions",
      "Gaming-optimized infrastructure",
      "Custom gas token economics",
    ],
    recommended: true,
  },
  {
    id: rariTestnet.id,
    name: "Rari Testnet",
    chain: rariTestnet,
    focus: "Creators & NFTs",
    description: "Built for creator economy and content verification",
    gasToken: "ETH",
    benefits: [
      "Perfect for content authenticity checks",
      "NFT trait generation with ML",
      "Standard ETH gas token",
    ],
  },
  {
    id: sankoTestnet.id,
    name: "Sanko Testnet",
    chain: sankoTestnet,
    focus: "DeFi & Trading",
    description: "DeFi-focused chain with ML for predictions",
    gasToken: "DMT",
    benefits: [
      "Trading signal generation",
      "Risk assessment models",
      "Custom DMT token economics",
    ],
  },
];

export function getOrbitChain(chainId: number): OrbitChainInfo | undefined {
  return orbitChains.find((chain) => chain.id === chainId);
}

export function isOrbitChain(chainId: number): boolean {
  return orbitChains.some((chain) => chain.id === chainId);
}
