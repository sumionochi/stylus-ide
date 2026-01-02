/**
 * GitHub API client for fetching repository contents
 */

import {
  GitHubTree,
  GitHubContent,
  GitHubRepo,
  GitHubError,
} from "@/types/github";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com";

export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRateLimit: boolean = false,
    public isNotFound: boolean = false,
    public isForbidden: boolean = false,
    public resetAt?: Date
  ) {
    super(message);
    this.name = "GitHubAPIError";
  }
}

/**
 * GitHub API client with rate limit handling
 */
export class GitHubAPIClient {
  private rateLimitRemaining: number | null = null;
  private rateLimitReset: number | null = null;

  /**
   * Fetch repository information
   */
  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
    return this.fetchJSON<GitHubRepo>(url);
  }

  /**
   * Fetch repository tree (all files recursively)
   */
  async getRepoTree(
    owner: string,
    repo: string,
    branch: string = "main"
  ): Promise<GitHubTree> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    return this.fetchJSON<GitHubTree>(url);
  }

  /**
   * Fetch file content (returns base64 encoded content)
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    branch?: string
  ): Promise<GitHubContent> {
    let url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
    if (branch) {
      url += `?ref=${branch}`;
    }
    return this.fetchJSON<GitHubContent>(url);
  }

  /**
   * Fetch raw file content (direct text)
   */
  async getRawFileContent(
    owner: string,
    repo: string,
    path: string,
    branch: string = "main"
  ): Promise<string> {
    const url = `${GITHUB_RAW_BASE}/${owner}/${repo}/${branch}/${path}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new GitHubAPIError(`File not found: ${path}`, 404, false, true);
        }
        throw new GitHubAPIError(
          `Failed to fetch file: ${response.statusText}`,
          response.status
        );
      }

      return response.text();
    } catch (error) {
      if (error instanceof GitHubAPIError) {
        throw error;
      }

      // Network error
      throw new GitHubAPIError(
        "Network error. Please check your connection and try again.",
        0
      );
    }
  }

  /**
   * Get default branch for repository
   */
  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const repo_info = await this.getRepo(owner, repo);
    return repo_info.default_branch;
  }

  /**
   * Check if branch exists
   */
  async branchExists(
    owner: string,
    repo: string,
    branch: string
  ): Promise<boolean> {
    try {
      await this.getRepoTree(owner, repo, branch);
      return true;
    } catch (error) {
      if (error instanceof GitHubAPIError && error.isNotFound) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Generic JSON fetch with error handling
   */
  private async fetchJSON<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          // Add GitHub token if available (increases rate limit)
          ...(process.env.NEXT_PUBLIC_GITHUB_TOKEN && {
            Authorization: `token ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`,
          }),
        },
      });

      // Update rate limit info
      this.updateRateLimitInfo(response);

      if (!response.ok) {
        const error: GitHubError = await response.json().catch(() => ({
          message: response.statusText,
        }));

        // Handle specific error cases
        if (response.status === 404) {
          throw new GitHubAPIError(
            "Repository not found. Please check the URL and try again.",
            404,
            false,
            true
          );
        } else if (response.status === 403) {
          // Check if it's rate limit or forbidden
          if (this.rateLimitRemaining === 0) {
            const resetDate = this.rateLimitReset
              ? new Date(this.rateLimitReset)
              : undefined;
            throw new GitHubAPIError(
              "GitHub API rate limit exceeded. Please try again later or add a GitHub token.",
              403,
              true,
              false,
              false,
              resetDate
            );
          } else {
            throw new GitHubAPIError(
              "Access forbidden. This repository may be private or require authentication.",
              403,
              false,
              false,
              true
            );
          }
        } else if (response.status === 401) {
          throw new GitHubAPIError(
            "Authentication failed. Please check your GitHub token.",
            401
          );
        } else if (response.status >= 500) {
          throw new GitHubAPIError(
            "GitHub is experiencing issues. Please try again later.",
            response.status
          );
        } else {
          throw new GitHubAPIError(
            error.message || "Failed to fetch from GitHub",
            response.status
          );
        }
      }

      return response.json();
    } catch (error) {
      if (error instanceof GitHubAPIError) {
        throw error;
      }

      // Network error or JSON parse error
      throw new GitHubAPIError(
        "Network error. Please check your connection and try again.",
        0
      );
    }
  }

  /**
   * Update rate limit tracking from response headers
   */
  private updateRateLimitInfo(response: Response): void {
    const remaining = response.headers.get("X-RateLimit-Remaining");
    const reset = response.headers.get("X-RateLimit-Reset");

    if (remaining) this.rateLimitRemaining = parseInt(remaining, 10);
    if (reset) this.rateLimitReset = parseInt(reset, 10) * 1000; // Convert to ms
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): { remaining: number | null; resetAt: Date | null } {
    return {
      remaining: this.rateLimitRemaining,
      resetAt: this.rateLimitReset ? new Date(this.rateLimitReset) : null,
    };
  }
}

// Export singleton instance
export const githubAPI = new GitHubAPIClient();
