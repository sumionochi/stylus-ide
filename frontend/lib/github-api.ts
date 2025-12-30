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
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Get default branch for repository
   */
  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const repo_info = await this.getRepo(owner, repo);
    return repo_info.default_branch;
  }

  /**
   * Generic JSON fetch with error handling
   */
  private async fetchJSON<T>(url: string): Promise<T> {
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

      if (response.status === 404) {
        throw new Error("Repository not found");
      } else if (response.status === 403) {
        throw new Error("Rate limit exceeded. Please try again later.");
      } else {
        throw new Error(error.message || "Failed to fetch from GitHub");
      }
    }

    return response.json();
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
