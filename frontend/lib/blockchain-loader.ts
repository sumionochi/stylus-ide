/**
 * Blockchain contract loader - for interaction panel, not editor
 */

import { ContractInteractionData } from "@/types/blockchain";
import { BlockchainURLInfo } from "@/lib/url-parser";
import { blockchainAPI } from "@/lib/blockchain-api";
import { getExplorerConfig } from "@/lib/blockchain-explorers";

export interface BlockchainLoadProgress {
  stage: "validating" | "fetching" | "parsing" | "complete" | "error";
  message: string;
  progress: number; // 0-100
  contractName?: string;
}

export type BlockchainProgressCallback = (
  progress: BlockchainLoadProgress
) => void;

/**
 * Fetch contract data for interaction (not for editor)
 */
export async function fetchContractForInteraction(
  urlInfo: BlockchainURLInfo,
  onProgress?: BlockchainProgressCallback
): Promise<ContractInteractionData> {
  const { explorerDomain, address, chain, network } = urlInfo;

  try {
    // Stage 1: Validate address format
    onProgress?.({
      stage: "validating",
      message: "Validating contract address...",
      progress: 10,
    });

    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error("Invalid Ethereum address format");
    }

    // Stage 2: Fetch contract source + ABI
    onProgress?.({
      stage: "fetching",
      message: `Fetching contract from ${chain}...`,
      progress: 40,
    });

    const sourceCode = await blockchainAPI.getContractSource(
      explorerDomain,
      address
    );

    onProgress?.({
      stage: "fetching",
      message: `Found contract: ${sourceCode.ContractName}`,
      progress: 70,
      contractName: sourceCode.ContractName,
    });

    // Stage 3: Extract ABI
    onProgress?.({
      stage: "parsing",
      message: "Extracting contract ABI...",
      progress: 85,
    });

    if (!sourceCode.ABI || sourceCode.ABI === "") {
      throw new Error("Contract ABI not available");
    }

    // Get explorer config for URL
    const explorerConfig = getExplorerConfig(explorerDomain);
    const explorerUrl = explorerConfig
      ? `${explorerConfig.explorerUrl}/address/${address}`
      : urlInfo.rawUrl;

    // Build contract interaction data
    const contractData: ContractInteractionData = {
      address,
      name: sourceCode.ContractName,
      chain,
      network,
      chainId: explorerConfig?.chainId || 0,
      abi: sourceCode.ABI,
      verified: true,
      compiler: sourceCode.CompilerVersion,
      optimization: sourceCode.OptimizationUsed === "1",
      explorerUrl,
    };

    onProgress?.({
      stage: "complete",
      message: `Ready to interact with ${sourceCode.ContractName}`,
      progress: 100,
      contractName: sourceCode.ContractName,
    });

    return contractData;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    onProgress?.({
      stage: "error",
      message: errorMessage,
      progress: 0,
    });

    throw error;
  }
}
