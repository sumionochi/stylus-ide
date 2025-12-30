/**
 * GitHub repository loader - converts GitHub repos to ProjectState
 */

import { ProjectState, ProjectFile } from "@/types/project";
import { GitHubURLInfo } from "@/lib/url-parser";
import { githubAPI } from "@/lib/github-api";
import { createProject } from "@/lib/project-manager";

export interface GitHubLoadProgress {
  stage:
    | "validating"
    | "fetching-tree"
    | "downloading-files"
    | "complete"
    | "error";
  message: string;
  progress: number; // 0-100
  filesTotal?: number;
  filesDownloaded?: number;
  currentFile?: string;
}

export type ProgressCallback = (progress: GitHubLoadProgress) => void;

/**
 * Load GitHub repository and convert to ProjectState
 */
export async function loadGitHubRepo(
  urlInfo: GitHubURLInfo,
  onProgress?: ProgressCallback
): Promise<ProjectState> {
  const { owner, repo, branch, file } = urlInfo;

  try {
    // Stage 1: Validate repository
    onProgress?.({
      stage: "validating",
      message: `Checking repository ${owner}/${repo}...`,
      progress: 10,
    });

    const repoInfo = await githubAPI.getRepo(owner, repo);
    const targetBranch = branch || repoInfo.default_branch;

    // Stage 2: Fetch repository tree
    onProgress?.({
      stage: "fetching-tree",
      message: "Fetching repository structure...",
      progress: 30,
    });

    const tree = await githubAPI.getRepoTree(owner, repo, targetBranch);

    // Filter for relevant files only (Rust, TOML, MD, etc.)
    const relevantFiles = tree.tree.filter((item) => {
      if (item.type !== "blob") return false;

      const ext = item.path.split(".").pop()?.toLowerCase();
      return ["rs", "toml", "md", "txt", "lock", "gitignore"].includes(
        ext || ""
      );
    });

    if (relevantFiles.length === 0) {
      throw new Error("No Rust or configuration files found in repository");
    }

    // Stage 3: Download files
    onProgress?.({
      stage: "downloading-files",
      message: `Downloading ${relevantFiles.length} files...`,
      progress: 50,
      filesTotal: relevantFiles.length,
      filesDownloaded: 0,
    });

    const files: ProjectFile[] = [];
    let downloadedCount = 0;

    for (const item of relevantFiles) {
      try {
        onProgress?.({
          stage: "downloading-files",
          message: `Downloading ${item.path}...`,
          progress: 50 + (downloadedCount / relevantFiles.length) * 40,
          filesTotal: relevantFiles.length,
          filesDownloaded: downloadedCount,
          currentFile: item.path,
        });

        // Use raw content API (faster and no base64 decoding needed)
        const content = await githubAPI.getRawFileContent(
          owner,
          repo,
          item.path,
          targetBranch
        );

        // Determine language from extension
        const ext = item.path.split(".").pop()?.toLowerCase() || "text";
        const languageMap: Record<string, ProjectFile["language"]> = {
          rs: "rust",
          toml: "toml",
          md: "markdown",
          txt: "text",
          lock: "text",
          gitignore: "gitignore",
        };

        files.push({
          id: `github-${item.sha}`,
          name: item.path.split("/").pop() || item.path,
          path: item.path,
          content,
          language: languageMap[ext] || "text",
          modified: false, // ✅ ADD THIS LINE
          isOpen: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        downloadedCount++;
      } catch (error) {
        console.warn(`Failed to download ${item.path}:`, error);
        // Continue with other files
      }
    }

    if (files.length === 0) {
      throw new Error("Failed to download any files from repository");
    }

    // Stage 4: Create project
    onProgress?.({
      stage: "complete",
      message: "Building project...",
      progress: 95,
    });

    // Create project from files
    const project = createProject(`${owner}-${repo}`, "github");

    // Replace default files with GitHub files
    project.files = files;

    // If specific file was requested, mark it as active
    if (file) {
      const targetFile = files.find((f) => f.path === file);
      if (targetFile) {
        targetFile.isOpen = true;
        project.activeFilePath = targetFile.path;
      }
    } else {
      // Open first .rs file by default
      const firstRustFile = files.find((f) => f.language === "rust");
      if (firstRustFile) {
        firstRustFile.isOpen = true;
        project.activeFilePath = firstRustFile.path;
      }
    }

    // Update project metadata
    project.name = repo;
    project.metadata = {
      source: "github",
      owner,
      repo,
      branch: targetBranch,
      url: urlInfo.rawUrl,
      loadedAt: new Date().toISOString(),
    };

    onProgress?.({
      stage: "complete",
      message: `Loaded ${files.length} files from ${owner}/${repo}`,
      progress: 100,
      filesTotal: files.length,
      filesDownloaded: files.length,
    });

    return project;
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

/**
 * Validate if repository is suitable for Stylus IDE
 */
export function validateGitHubRepo(tree: { path: string }[]): {
  isValid: boolean;
  reason?: string;
} {
  const hasRustFiles = tree.some((item) => item.path.endsWith(".rs"));
  const hasCargoToml = tree.some((item) => item.path === "Cargo.toml");

  if (!hasRustFiles) {
    return { isValid: false, reason: "No Rust files found" };
  }

  if (!hasCargoToml) {
    return { isValid: false, reason: "No Cargo.toml found" };
  }

  return { isValid: true };
}
