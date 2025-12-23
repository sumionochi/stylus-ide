/**
 * Project File Structure Types
 * Core data structures for multi-file project management
 */

export interface ProjectFile {
  id: string; // Unique identifier (uuid)
  path: string; // Full path: 'src/lib.rs'
  name: string; // File name: 'lib.rs'
  content: string; // File content
  language: "rust" | "toml" | "markdown" | "text" | "gitignore";
  modified: boolean; // Has unsaved changes
  isOpen: boolean; // Is currently open in a tab
  createdAt: Date;
  updatedAt: Date;
}

export interface FileNode {
  id: string; // Unique identifier
  name: string; // Display name
  path: string; // Full path
  type: "file" | "folder";
  children?: FileNode[]; // For folders only
  expanded?: boolean; // Folder expansion state
  parentId?: string | null; // Parent folder ID
}

export interface ProjectState {
  id: string; // Project identifier
  name: string; // Project name
  files: ProjectFile[]; // All project files
  structure: FileNode[]; // Tree structure
  activeFilePath: string | null; // Currently active file
  source: "local" | "github" | "onchain";
  metadata?: ProjectMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMetadata {
  // For GitHub-loaded projects
  githubUrl?: string;
  owner?: string;
  repo?: string;
  branch?: string;

  // For on-chain loaded contracts
  contractAddress?: string;
  chainId?: number;
  verified?: boolean;
  verifiedAt?: Date;
  compiler?: string;

  // General
  description?: string;
  tags?: string[];
}

export interface CreateFileOptions {
  path: string;
  content?: string;
  language?: ProjectFile["language"];
}

export interface CreateFolderOptions {
  path: string;
}

export interface MoveFileOptions {
  fromPath: string;
  toPath: string;
}

export interface RenameOptions {
  oldPath: string;
  newPath: string;
}

// Helper types
export type FileLanguage = ProjectFile["language"];
export type ProjectSource = ProjectState["source"];
