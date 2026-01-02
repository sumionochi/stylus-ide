"use client";

import { useState, useCallback } from "react";
import { ContractInteractionData } from "@/types/blockchain";
import { BlockchainURLInfo } from "@/lib/url-parser";
import {
  fetchContractForInteraction,
  BlockchainLoadProgress,
} from "@/lib/blockchain-loader";

export function useBlockchainLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<BlockchainLoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFromBlockchain = useCallback(
    async (
      urlInfo: BlockchainURLInfo
    ): Promise<ContractInteractionData | null> => {
      setIsLoading(true);
      setError(null);
      setProgress(null);

      try {
        const contractData = await fetchContractForInteraction(
          urlInfo,
          (progressUpdate) => {
            setProgress(progressUpdate);
          }
        );

        setIsLoading(false);
        return contractData;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    isLoading,
    progress,
    error,
    loadFromBlockchain,
    reset,
  };
}
