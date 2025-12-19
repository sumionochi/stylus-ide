import { defineChain, type Chain } from "viem";

/**
 * Sources:
 * - Xai Testnet v2: https://xai-foundation.gitbook.io/xai-network/technology/xai-chains-and-parameters/xai-testnet-v2
 * - Rari Testnet: https://docs.rarichain.org/rari-chain/testnet
 * - Sanko Testnet: https://docs.sanko.xyz/build-on-sanko/connect-to-sanko-testnet
 * - (Sanko Mainnet for reference): https://docs.sanko.xyz/sanko-mainnet/connect-to-sanko-mainnet
 */

// Xai Testnet v2 (often referred to as "XAI Sepolia" in wallets/UIs)
export const xaiSepolia = defineChain({
  id: 37714555429,
  name: "Xai Testnet v2",
  network: "xai-testnet-v2",
  nativeCurrency: {
    decimals: 18,
    name: "sXAI",
    symbol: "sXAI",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-v2.xai-chain.net/rpc"],
    },
    public: {
      http: ["https://testnet-v2.xai-chain.net/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "XaiScan (Sepolia)",
      url: "https://sepolia.xaiscan.io",
    },
  },
  testnet: true,
});

// Rari Chain Testnet
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
      url: "https://explorer.rarichain.org",
    },
  },
  testnet: true,
});

// Sanko Testnet (Arbitrum Sepolia-based)
export const sankoTestnet = defineChain({
  id: 1992,
  name: "Sanko Testnet",
  network: "sanko-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "tDMT",
    symbol: "tDMT",
  },
  rpcUrls: {
    default: {
      http: ["https://sanko-arb-sepolia.rpc.caldera.xyz/http"],
    },
    public: {
      http: ["https://sanko-arb-sepolia.rpc.caldera.xyz/http"],
    },
  },
  blockExplorers: {
    default: {
      name: "SankoScan (Testnet)",
      url: "https://testnet.sankoscan.io",
    },
  },
  testnet: true,
});

// (Optional) If you ALSO want Sanko mainnet in your app later, keep this export.
// export const sankoMainnet = defineChain({
//   id: 1996,
//   name: "Sanko",
//   network: "sanko",
//   nativeCurrency: {
//     decimals: 18,
//     name: "DMT",
//     symbol: "DMT",
//   },
//   rpcUrls: {
//     default: {
//       http: ["https://mainnet.sanko.xyz"],
//     },
//     public: {
//       http: ["https://mainnet.sanko.xyz"],
//     },
//   },
//   blockExplorers: {
//     default: {
//       name: "Sanko Explorer",
//       url: "https://explorer.sanko.xyz",
//     },
//   },
//   testnet: false,
// });

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
    name: "Xai Testnet v2",
    chain: xaiSepolia,
    focus: "Gaming & AI",
    description:
      "Xai Orbit chain testnet v2 (sXAI gas) for gaming/AI workloads",
    gasToken: "sXAI",
    benefits: [
      "Gaming-focused Orbit ecosystem",
      "Good fit for frequent inference calls",
      "Dedicated explorer + infra",
    ],
    recommended: true,
  },
  {
    id: rariTestnet.id,
    name: "Rari Testnet",
    chain: rariTestnet,
    focus: "Creators & NFTs",
    description: "Rari Chain testnet for creator apps and NFTs (ETH gas)",
    gasToken: "ETH",
    benefits: [
      "Creator economy focus",
      "NFT/content primitives",
      "Standard ETH gas token",
    ],
  },
  {
    id: sankoTestnet.id,
    name: "Sanko Testnet",
    chain: sankoTestnet,
    focus: "DeFi & Trading",
    description: "Sanko testnet (Arbitrum Sepolia-based) for DeFi experiments",
    gasToken: "tDMT",
    benefits: [
      "DeFi experimentation environment",
      "Caldera-hosted RPC",
      "Dedicated testnet explorer",
    ],
  },
];

export function getOrbitChain(chainId: number): OrbitChainInfo | undefined {
  return orbitChains.find((chain) => chain.id === chainId);
}

export function isOrbitChain(chainId: number): boolean {
  return orbitChains.some((chain) => chain.id === chainId);
}
