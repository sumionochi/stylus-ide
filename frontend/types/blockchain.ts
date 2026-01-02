/**
 * Blockchain explorer types
 */

// types/blockchain.ts
export interface BlockchainExplorerConfig {
  name: string;
  chain: string;
  network: string;
  chainId: number; // ✅ add this
  apiUrl: string;
  explorerUrl: string;
  apiKeyRequired: boolean;
}

export interface ContractSourceCode {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
}

export interface ExplorerAPIResponse {
  status: string;
  message: string;
  result: ContractSourceCode[] | string;
}

export interface ParsedContractSource {
  type: "single" | "multi-file" | "flattened";
  files: {
    path: string;
    content: string;
  }[];
  mainFile: string;
}

// Add to existing file (keep everything else)

/**
 * Contract data for interaction (not loading to editor)
 */
export interface ContractInteractionData {
  address: string;
  name: string;
  chain: string;
  network: string;
  chainId: number;
  abi: string; // JSON string
  verified: boolean;
  compiler?: string;
  optimization?: boolean;
  explorerUrl: string;
}
