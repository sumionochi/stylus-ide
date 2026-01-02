/**
 * Blockchain explorer API client
 */

import {
  ExplorerAPIResponse,
  ContractSourceCode,
  ParsedContractSource,
} from "@/types/blockchain";
import { getExplorerConfig } from "@/lib/blockchain-explorers";

export class BlockchainAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isNotVerified: boolean = false,
    public isInvalidAddress: boolean = false,
    public isAPIKeyMissing: boolean = false
  ) {
    super(message);
    this.name = "BlockchainAPIError";
  }
}

/**
 * Blockchain API Client
 */
export class BlockchainAPIClient {
  private apiKeys: Record<string, string> = {};

  constructor() {
    // Load API keys from environment (client-side only)
    if (typeof window !== "undefined") {
      console.log("🔑 Loading API keys from environment...");

      const arbiscanKey = process.env.NEXT_PUBLIC_ARBISCAN_API_KEY;
      const etherscanKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
      const basescanKey = process.env.NEXT_PUBLIC_BASESCAN_API_KEY;

      console.log("Available keys:", {
        arbiscan: !!arbiscanKey,
        etherscan: !!etherscanKey,
        basescan: !!basescanKey,
      });

      this.apiKeys = {
        "arbiscan.io": arbiscanKey || "",
        "sepolia.arbiscan.io": arbiscanKey || "", // Use same key for testnet
        "etherscan.io": etherscanKey || "",
        "sepolia.etherscan.io": etherscanKey || "",
        "basescan.org": basescanKey || "",
      };
    }
  }

  /**
   * Fetch contract source code from explorer
   */
  async getContractSource(
    explorerDomain: string,
    address: string
  ): Promise<ContractSourceCode> {
    const config = getExplorerConfig(explorerDomain);

    if (!config) {
      throw new BlockchainAPIError(
        `Unsupported blockchain explorer: ${explorerDomain}`,
        0,
        false,
        false,
        false
      );
    }

    // Get API key for this explorer (for V2: typically your Etherscan API key)
    const apiKey = this.apiKeys[explorerDomain] || "";

    console.log("🔍 API Key check:", {
      domain: explorerDomain,
      hasKey: !!apiKey,
      keyPreview: apiKey ? apiKey.slice(0, 10) + "..." : "none",
    });

    if (!apiKey && config.apiKeyRequired) {
      throw new BlockchainAPIError(
        `API key required for ${config.name}. Please add NEXT_PUBLIC_ETHERSCAN_API_KEY to your .env.local file.`,
        0,
        false,
        false,
        true
      );
    }

    // --- V2 IMPORTANT: include chainid (default is 1, but you should always pass it) ---
    // Ensure your BlockchainExplorerConfig includes chainId:number
    const chainId =
      (config as any).chainId ??
      (config.network === "sepolia" && config.chain === "ethereum"
        ? 11155111
        : config.network === "mainnet" && config.chain === "ethereum"
        ? 1
        : undefined);

    if (!chainId) {
      throw new BlockchainAPIError(
        `Missing chainId for explorer ${config.name}. Add chainId to BLOCKCHAIN_EXPLORERS config.`,
        0
      );
    }

    const params = new URLSearchParams({
      chainid: String(chainId), // ✅ V2
      module: "contract",
      action: "getsourcecode",
      address,
    });

    if (apiKey) params.set("apikey", apiKey);

    const url = `${config.apiUrl}?${params.toString()}`;

    console.log("📡 API Request:", {
      url: apiKey ? url.replace(apiKey, "API_KEY_HIDDEN") : url,
      address,
      chainId,
    });

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new BlockchainAPIError(
          `Failed to fetch from ${config.name}: ${response.statusText}`,
          response.status
        );
      }

      const data: ExplorerAPIResponse = await response.json();

      console.log("📦 API Response:", {
        status: data.status,
        message: data.message,
        hasResult: !!data.result,
      });

      // Check API response status
      if (data.status !== "1") {
        console.error("❌ API Error Details:", data);

        const resultText = typeof data.result === "string" ? data.result : "";
        const combinedText = `${data.message || ""} ${resultText || ""}`.trim();

        // V1 deprecation message (means you're still hitting a V1 endpoint somewhere)
        if (combinedText.toLowerCase().includes("deprecated v1 endpoint")) {
          throw new BlockchainAPIError(
            `You are hitting a deprecated V1 endpoint. Ensure config.apiUrl is "https://api.etherscan.io/v2/api" and you pass "chainid" for ${config.chain} ${config.network}.`,
            0
          );
        }

        // Invalid API key (often comes via result text in V2)
        if (combinedText.toLowerCase().includes("invalid api key")) {
          throw new BlockchainAPIError(
            `Invalid API key for ${config.name}. Please check NEXT_PUBLIC_ETHERSCAN_API_KEY.`,
            0,
            false,
            false,
            true
          );
        }

        // Some V2 errors are returned as NOTOK with details in `result`
        if (data.message === "NOTOK") {
          throw new BlockchainAPIError(
            `API request failed: ${
              resultText || data.message
            }\n\nChecks:\n1) API key is valid\n2) Contract address is correct\n3) Correct chainid (${chainId}) for ${
              config.chain
            } ${config.network}`,
            0
          );
        }

        throw new BlockchainAPIError(
          `API Error: ${combinedText || "Unknown error"}`,
          0
        );
      }

      // Parse result
      const result = Array.isArray(data.result) ? data.result[0] : data.result;

      if (!result || typeof result === "string") {
        throw new BlockchainAPIError("Invalid response from explorer API", 0);
      }

      const sourceCode = result as ContractSourceCode;

      // Check if contract is verified
      if (!sourceCode.SourceCode || sourceCode.SourceCode === "") {
        throw new BlockchainAPIError(
          "Contract is not verified on this explorer",
          0,
          true
        );
      }

      console.log("✅ Contract loaded:", sourceCode.ContractName);

      return sourceCode;
    } catch (error) {
      if (error instanceof BlockchainAPIError) {
        throw error;
      }

      console.error("❌ Network/Unknown error:", error);
      throw new BlockchainAPIError(
        "Network error. Please check your connection and try again.",
        0
      );
    }
  }

  /**
   * Parse contract source code into files
   */
  parseContractSource(sourceCode: ContractSourceCode): ParsedContractSource {
    const rawSource = sourceCode.SourceCode;

    console.log("🔍 Parsing contract source...");
    console.log("Raw source length:", rawSource.length);
    console.log("First 100 chars:", rawSource.substring(0, 100));

    // Check if it's multi-file (JSON format)
    if (rawSource.startsWith("{")) {
      try {
        let parsed: any;

        // Try double-brace format first: {{...}}
        if (rawSource.startsWith("{{") && rawSource.endsWith("}}")) {
          console.log("📦 Detected double-brace format");
          const jsonStr = rawSource.slice(1, -1);
          parsed = JSON.parse(jsonStr);
        } else {
          console.log("📦 Detected standard JSON format");
          parsed = JSON.parse(rawSource);
        }

        console.log("Parsed keys:", Object.keys(parsed));

        // Standard JSON format: { "language": "Solidity", "sources": {...} }
        if (parsed.sources) {
          console.log("✅ Using standard JSON sources format");
          console.log("Source files:", Object.keys(parsed.sources));

          const files = Object.entries(parsed.sources).map(
            ([path, sourceObj]: [string, any]) => {
              // Clean path
              const cleanPath = path.startsWith("/") ? path.slice(1) : path;

              // Extract content - handle different structures
              let content = "";
              if (typeof sourceObj === "string") {
                content = sourceObj;
              } else if (sourceObj && typeof sourceObj === "object") {
                content = sourceObj.content || sourceObj.source || "";
              }

              console.log(`  - ${cleanPath}: ${content.length} bytes`);

              return {
                path: cleanPath,
                content,
              };
            }
          );

          // Also include language and settings as files if present
          if (parsed.language) {
            files.push({
              path: "metadata/language.txt",
              content: parsed.language,
            });
          }

          if (parsed.settings) {
            files.push({
              path: "metadata/settings.json",
              content: JSON.stringify(parsed.settings, null, 2),
            });
          }

          return {
            type: "multi-file",
            files: files.filter((f) => f.content && f.content.length > 0), // Filter empty files
            mainFile: files[0]?.path || "Contract.sol",
          };
        }

        // Legacy format: { "Contract.sol": {...}, "OtherFile.sol": {...} }
        console.log("✅ Using legacy JSON format");
        const files = Object.entries(parsed)
          .filter(([key]) => !["language", "settings"].includes(key))
          .map(([path, sourceObj]: [string, any]) => {
            const cleanPath = path.startsWith("/") ? path.slice(1) : path;

            let content = "";
            if (typeof sourceObj === "string") {
              content = sourceObj;
            } else if (sourceObj && typeof sourceObj === "object") {
              content = sourceObj.content || sourceObj.source || "";
            }

            console.log(`  - ${cleanPath}: ${content.length} bytes`);

            return {
              path: cleanPath,
              content,
            };
          })
          .filter((f) => f.content && f.content.length > 0);

        if (files.length === 0) {
          throw new Error("No valid source files found in JSON");
        }

        return {
          type: "multi-file",
          files,
          mainFile: files[0]?.path || "Contract.sol",
        };
      } catch (error) {
        console.error("❌ Failed to parse JSON:", error);
        console.log("Falling back to single file mode");
      }
    }

    // Single file or flattened contract
    console.log("📄 Using single file format");
    const fileName = `${sourceCode.ContractName}.sol`;

    if (!rawSource || rawSource.length === 0) {
      throw new Error("Source code is empty");
    }

    return {
      type: rawSource.includes("// File:") ? "flattened" : "single",
      files: [
        {
          path: fileName,
          content: rawSource,
        },
      ],
      mainFile: fileName,
    };
  }

  /**
   * Set API key for an explorer
   */
  setAPIKey(explorerDomain: string, apiKey: string): void {
    this.apiKeys[explorerDomain] = apiKey;
  }

  /**
   * Check if API key is set for explorer
   */
  hasAPIKey(explorerDomain: string): boolean {
    return !!this.apiKeys[explorerDomain];
  }
}

// Export singleton instance
export const blockchainAPI = new BlockchainAPIClient();
