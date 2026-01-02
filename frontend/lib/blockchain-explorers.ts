// lib/blockchain-explorers.ts
import { BlockchainExplorerConfig } from "@/types/blockchain";

const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api";

export const BLOCKCHAIN_EXPLORERS: Record<string, BlockchainExplorerConfig> = {
  "etherscan.io": {
    name: "Etherscan",
    chain: "ethereum",
    network: "mainnet",
    chainId: 1,
    apiUrl: ETHERSCAN_V2_BASE,
    explorerUrl: "https://etherscan.io",
    apiKeyRequired: true,
  },
  "sepolia.etherscan.io": {
    name: "Sepolia Etherscan",
    chain: "ethereum",
    network: "sepolia",
    chainId: 11155111,
    apiUrl: ETHERSCAN_V2_BASE, // ✅ don't use api-sepolia host for V2
    explorerUrl: "https://sepolia.etherscan.io",
    apiKeyRequired: true,
  },
  "arbiscan.io": {
    name: "Arbiscan",
    chain: "arbitrum",
    network: "mainnet",
    chainId: 42161,
    apiUrl: ETHERSCAN_V2_BASE, // ✅ unified V2 base
    explorerUrl: "https://arbiscan.io",
    apiKeyRequired: true,
  },
  "sepolia.arbiscan.io": {
    name: "Arbiscan Sepolia",
    chain: "arbitrum",
    network: "sepolia",
    chainId: 421614,
    apiUrl: ETHERSCAN_V2_BASE,
    explorerUrl: "https://sepolia.arbiscan.io",
    apiKeyRequired: true,
  },
  "basescan.org": {
    name: "Basescan",
    chain: "base",
    network: "mainnet",
    chainId: 8453,
    apiUrl: ETHERSCAN_V2_BASE,
    explorerUrl: "https://basescan.org",
    apiKeyRequired: true,
  },
};

/**
 * Get explorer config by domain
 */
export function getExplorerConfig(
  domain: string
): BlockchainExplorerConfig | null {
  return BLOCKCHAIN_EXPLORERS[domain] || null;
}

/**
 * Get all supported explorers
 */
export function getSupportedExplorers(): BlockchainExplorerConfig[] {
  return Object.values(BLOCKCHAIN_EXPLORERS);
}

/**
 * Check if domain is a supported explorer
 */
export function isSupportedExplorer(domain: string): boolean {
  return domain in BLOCKCHAIN_EXPLORERS;
}
