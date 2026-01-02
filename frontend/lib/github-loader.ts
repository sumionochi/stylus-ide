/**
 * GitHub repository loader - converts GitHub repos to ProjectState
 */

import { ProjectState, ProjectFile } from "@/types/project";
import { GitHubURLInfo } from "@/lib/url-parser";
import { githubAPI } from "@/lib/github-api";
import { createProject } from "@/lib/project-manager";
import { GitHubFile } from "@/types/github";

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

/**
 * Filter files to only include those in a specific folder
 */
function filterFilesByPath(
  files: GitHubFile[], // ✅ CHANGE: was { path: string }[]
  folderPath: string
): GitHubFile[] {
  // ✅ CHANGE: was { path: string }[]
  // Normalize folder path (remove trailing slash)
  const normalizedPath = folderPath.endsWith("/")
    ? folderPath.slice(0, -1)
    : folderPath;

  return files.filter((file) => {
    // File must start with the folder path
    if (!file.path.startsWith(normalizedPath + "/")) {
      return false;
    }
    return true;
  });
}

/**
 * Strip folder prefix from file paths
 * Example: "src/lib.rs" with prefix "src" becomes "lib.rs"
 */
function stripPathPrefix(path: string, prefix: string): string {
  const normalizedPrefix = prefix.endsWith("/") ? prefix : prefix + "/";

  if (path.startsWith(normalizedPrefix)) {
    return path.substring(normalizedPrefix.length);
  }

  return path;
}

/**
 * Validate if repository has Rust/Stylus files
 */
function validateStylusRepo(files: { path: string }[]): {
  isValid: boolean;
  hasRust: boolean;
  hasCargo: boolean;
  warnings: string[];
} {
  const hasRust = files.some((f) => f.path.endsWith(".rs"));
  const hasCargo = files.some(
    (f) => f.path === "Cargo.toml" || f.path.endsWith("/Cargo.toml")
  );
  const warnings: string[] = [];

  if (!hasRust) {
    warnings.push("No Rust files (.rs) found in repository");
  }

  if (!hasCargo) {
    warnings.push("No Cargo.toml found - this may not be a valid Rust project");
  }

  // Check for common non-Rust repos
  const hasPackageJson = files.some((f) => f.path === "package.json");
  const hasPyFiles = files.some((f) => f.path.endsWith(".py"));
  const hasGoFiles = files.some((f) => f.path.endsWith(".go"));

  if (hasPackageJson && !hasRust) {
    warnings.push(
      "This appears to be a JavaScript/TypeScript project, not Rust"
    );
  }
  if (hasPyFiles && !hasRust) {
    warnings.push("This appears to be a Python project, not Rust");
  }
  if (hasGoFiles && !hasRust) {
    warnings.push("This appears to be a Go project, not Rust");
  }

  return {
    isValid: hasRust,
    hasRust,
    hasCargo,
    warnings,
  };
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

    // Check if specific branch exists
    if (branch && branch !== repoInfo.default_branch) {
      const branchExists = await githubAPI.branchExists(owner, repo, branch);
      if (!branchExists) {
        throw new Error(
          `Branch "${branch}" not found. Available branch: ${repoInfo.default_branch}`
        );
      }
    }

    // Stage 2: Fetch repository tree
    onProgress?.({
      stage: "fetching-tree",
      message: "Fetching repository structure...",
      progress: 30,
    });

    const tree = await githubAPI.getRepoTree(owner, repo, targetBranch);

    // Check if repo is empty
    if (tree.tree.length === 0) {
      throw new Error("Repository is empty. No files found.");
    }

    // Validate it's a Rust/Stylus project
    const validation = validateStylusRepo(tree.tree);

    if (!validation.isValid) {
      throw new Error(
        `Not a valid Stylus project:\n${validation.warnings.join("\n")}`
      );
    }

    // Show warnings but continue
    if (validation.warnings.length > 0) {
      console.warn("Repository warnings:", validation.warnings);
    }

    // Filter for relevant files only (Rust, TOML, MD, etc.)
    let relevantFiles = tree.tree.filter((item) => {
      if (item.type !== "blob") return false;

      const ext = item.path.split(".").pop()?.toLowerCase();
      return ["rs", "toml", "md", "txt", "lock", "gitignore"].includes(
        ext || ""
      );
    });

    // ✅ NEW: Filter by folder path if specified
    if (urlInfo.path) {
      const beforeFilter = relevantFiles.length;
      relevantFiles = filterFilesByPath(relevantFiles, urlInfo.path);

      console.log(
        `Filtered to folder "${urlInfo.path}": ${beforeFilter} → ${relevantFiles.length} files`
      );

      if (relevantFiles.length === 0) {
        throw new Error(`No files found in folder "${urlInfo.path}"`);
      }
    }

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
    const failedFiles: string[] = [];
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

        // ✅ NEW: Strip folder prefix if loading specific folder
        const displayPath = urlInfo.path
          ? stripPathPrefix(item.path, urlInfo.path)
          : item.path;

        files.push({
          id: `github-${item.sha}`,
          name: displayPath.split("/").pop() || displayPath,
          path: displayPath, // Use stripped path
          content,
          language: languageMap[ext] || "text",
          modified: false,
          isOpen: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        downloadedCount++;
      } catch (error) {
        console.warn(`Failed to download ${item.path}:`, error);
        failedFiles.push(item.path);
        // Continue with other files
      }
    }

    if (files.length === 0) {
      throw new Error("Failed to download any files from repository");
    }

    // Warn about failed files
    if (failedFiles.length > 0) {
      console.warn(
        `Failed to download ${failedFiles.length} files:`,
        failedFiles
      );
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
      } else {
        console.warn(`Requested file "${file}" not found in repository`);
      }
    }

    // If no file specified or file not found, open first .rs file by default
    if (!project.activeFilePath) {
      const firstRustFile = files.find((f) => f.language === "rust");
      if (firstRustFile) {
        firstRustFile.isOpen = true;
        project.activeFilePath = firstRustFile.path;
      }
    }

    // Update project metadata
    project.name = urlInfo.path ? `${repo}/${urlInfo.path}` : repo;
    project.metadata = {
      source: "github",
      owner,
      repo,
      branch: targetBranch,
      url: urlInfo.rawUrl,
      loadedAt: new Date().toISOString(),
      folderPath: urlInfo.path, // ✅ NEW: Track loaded folder
    };

    onProgress?.({
      stage: "complete",
      message: `Loaded ${files.length} files from ${owner}/${repo}${
        failedFiles.length > 0 ? ` (${failedFiles.length} files skipped)` : ""
      }`,
      progress: 100,
      filesTotal: files.length,
      filesDownloaded: files.length,
    });

    return project;
  } catch (error) {
    let errorMessage = "Unknown error occurred";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

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
