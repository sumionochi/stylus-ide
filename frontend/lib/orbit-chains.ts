import { defineChain, type Chain } from "viem";

/**
 * Verified sources:
 * - Xai Testnet v2 (Sepolia)
 * - ApeChain Curtis (Testnet)
 * - Nitrogen (Orbit Celestia) Testnet
 *
 * Note: “PublicNode” provider does not currently list these Orbit testnets like it does for Arbitrum Sepolia,
 * so we include other public/free RPC providers (Caldera/official + thirdweb/dRPC/Ankr/etc).
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
      http: [
        "https://testnet-v2.xai-chain.net/rpc",
        "https://rpc.ankr.com/xai_testnet",
        "https://37714555429.rpc.thirdweb.com",
        "https://xai-testnet.rpc.quicknode.com",
      ],
    },
    public: {
      http: [
        "https://testnet-v2.xai-chain.net/rpc",
        "https://rpc.ankr.com/xai_testnet",
        "https://37714555429.rpc.thirdweb.com",
        "https://xai-testnet.rpc.quicknode.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "XaiScan (Sepolia)",
      url: "https://sepolia.xaiscan.io/",
    },
  },
  testnet: true,
});

// ApeChain Curtis (Testnet) — Arbitrum Orbit rollup
export const apechainCurtis = defineChain({
  id: 33111,
  name: "ApeChain Curtis (Testnet)",
  network: "apechain-curtis",
  nativeCurrency: {
    decimals: 18,
    name: "ApeCoin",
    symbol: "APE",
  },
  rpcUrls: {
    default: {
      http: [
        "https://curtis.rpc.caldera.xyz/http",
        "https://rpc.curtis.apechain.com",
        "https://apechain-curtis.drpc.org",
        "https://33111.rpc.thirdweb.com",
        "https://curtis.gateway.tenderly.co",
      ],
    },
    public: {
      http: [
        "https://curtis.rpc.caldera.xyz/http",
        "https://rpc.curtis.apechain.com",
        "https://apechain-curtis.drpc.org",
        "https://33111.rpc.thirdweb.com",
        "https://curtis.gateway.tenderly.co",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Curtis Explorer",
      url: "https://curtis.explorer.caldera.xyz/",
    },
  },
  testnet: true,
});

// Nitrogen (Orbit Celestia) Testnet — settlement: Arbitrum Sepolia
export const nitrogenTestnet = defineChain({
  id: 96384675468,
  name: "Nitrogen (Orbit Celestia) Testnet",
  network: "nitrogen",
  nativeCurrency: {
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://nitrogen-rpc.altlayer.io"],
    },
    public: {
      http: ["https://nitrogen-rpc.altlayer.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Nitrogen Explorer",
      url: "https://nitrogen-explorer.altlayer.io/",
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
    id: apechainCurtis.id,
    name: "ApeChain Curtis (Testnet)",
    chain: apechainCurtis,
    focus: "Gaming / Consumer Apps",
    description:
      "ApeChain public testnet (APE gas) on Arbitrum Orbit (Caldera infra)",
    gasToken: "APE",
    benefits: [
      "Non-ETH gas token (good for comparisons)",
      "Public Caldera + ApeChain RPC options",
      "Great for benchmarking app-style workloads",
    ],
    recommended: true,
  },
  {
    id: nitrogenTestnet.id,
    name: "Nitrogen (Orbit Celestia) Testnet",
    chain: nitrogenTestnet,
    focus: "DA / Infra Experiments",
    description:
      "Arbitrum Orbit public testnet using Celestia DA (settles to Arbitrum Sepolia)",
    gasToken: "ETH",
    benefits: [
      "Public RPC + explorer",
      "Interesting Orbit + DA story for demos",
      "Good baseline ETH-gas comparison vs other Orbit chains",
    ],
  },
];

export function getOrbitChain(chainId: number): OrbitChainInfo | undefined {
  return orbitChains.find((chain) => chain.id === chainId);
}

export function isOrbitChain(chainId: number): boolean {
  return orbitChains.some((chain) => chain.id === chainId);
}
