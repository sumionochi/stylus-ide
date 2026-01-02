/**
 * URL parser for GitHub repositories
 * Supports various GitHub URL formats
 */

export type GitHubURLInfo = {
  type: "github";
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
  file?: string;
  rawUrl: string;
};

export type BlockchainURLInfo = {
  type: "blockchain";
  chain: string;
  network: string;
  address: string;
  explorerDomain: string;
  rawUrl: string;
};

export type ParsedURL =
  | GitHubURLInfo
  | BlockchainURLInfo
  | { type: "unknown"; rawUrl: string };

/**
 * Parse GitHub URL and extract components
 */
export function parseGitHubURL(url: string): GitHubURLInfo | null {
  try {
    const urlObj = new URL(url);

    // Must be github.com
    if (urlObj.hostname !== "github.com") {
      return null;
    }

    // Extract path parts: /owner/repo/tree/branch/path or /owner/repo
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    if (pathParts.length < 2) {
      return null; // Need at least owner/repo
    }

    const owner = pathParts[0];
    const repo = pathParts[1];
    let branch: string | undefined;
    let path: string | undefined;
    let file: string | undefined;

    // Check for branch/path patterns
    if (pathParts[2] === "tree" && pathParts.length > 3) {
      // Format: /owner/repo/tree/branch/path...
      branch = pathParts[3];
      if (pathParts.length > 4) {
        path = pathParts.slice(4).join("/");
      }
    } else if (pathParts[2] === "blob" && pathParts.length > 3) {
      // Format: /owner/repo/blob/branch/file.rs
      branch = pathParts[3];
      if (pathParts.length > 4) {
        file = pathParts.slice(4).join("/");
      }
    }

    // Check for query parameters (override URL path values)
    const searchParams = new URLSearchParams(urlObj.search);
    const queryBranch = searchParams.get("branch");
    const queryFile = searchParams.get("file");
    const queryPath = searchParams.get("path");

    // Query params take precedence
    if (queryBranch) branch = queryBranch;
    if (queryFile) file = queryFile;
    if (queryPath) path = queryPath;

    return {
      type: "github",
      owner,
      repo,
      branch,
      path,
      file,
      rawUrl: url,
    };
  } catch (error) {
    console.error("Failed to parse GitHub URL:", error);
    return null;
  }
}

/**
 * Parse blockchain explorer URL and extract address
 */
export function parseBlockchainURL(url: string): BlockchainURLInfo | null {
  try {
    const urlObj = new URL(url);

    // Map of supported explorers
    const explorerMap: Record<string, { chain: string; network: string }> = {
      "arbiscan.io": { chain: "arbitrum", network: "mainnet" },
      "sepolia.arbiscan.io": { chain: "arbitrum", network: "sepolia" },
      "etherscan.io": { chain: "ethereum", network: "mainnet" },
      "sepolia.etherscan.io": { chain: "ethereum", network: "sepolia" },
      "basescan.org": { chain: "base", network: "mainnet" },
    };

    const explorerConfig = explorerMap[urlObj.hostname];

    if (!explorerConfig) {
      return null; // Unknown explorer
    }

    // Extract address from path
    const addressMatch = urlObj.pathname.match(
      /\/address\/(0x[a-fA-F0-9]{40})/
    );

    if (!addressMatch) {
      return null; // No valid address found
    }

    return {
      type: "blockchain",
      chain: explorerConfig.chain,
      network: explorerConfig.network,
      address: addressMatch[1],
      explorerDomain: urlObj.hostname,
      rawUrl: url,
    };
  } catch (error) {
    console.error("Failed to parse blockchain URL:", error);
    return null;
  }
}

/**
 * Main URL parser - detects type and parses accordingly
 */
export function parseURL(url: string): ParsedURL {
  // Try GitHub first
  const githubInfo = parseGitHubURL(url);
  if (githubInfo) {
    return githubInfo;
  }

  // Try blockchain explorer
  const blockchainInfo = parseBlockchainURL(url);
  if (blockchainInfo) {
    return blockchainInfo;
  }

  // Unknown type
  return {
    type: "unknown",
    rawUrl: url,
  };
}

/**
 * Validate if URL is supported
 */
export function isSupportedURL(url: string): boolean {
  const parsed = parseURL(url);
  return parsed.type !== "unknown";
}

/**
 * Get display name for parsed URL
 */
export function getURLDisplayName(parsed: ParsedURL): string {
  if (parsed.type === "github") {
    return `${parsed.owner}/${parsed.repo}`;
  }

  if (parsed.type === "blockchain") {
    return `${parsed.chain} ${parsed.address.slice(
      0,
      6
    )}...${parsed.address.slice(-4)}`;
  }

  return "Unknown Source";
}
