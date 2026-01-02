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

// ✅ KEEP ONLY THIS ONE ProjectState (delete the duplicate below)
export interface ProjectState {
  id: string;
  name: string;
  type: "stylus-contract" | "stylus-library";
  files: ProjectFile[];
  structure: FileNode[];
  activeFilePath: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    source?: "github" | "blockchain" | "local";
    owner?: string;
    repo?: string;
    branch?: string;
    url?: string;
    loadedAt?: string;
    chain?: string;
    address?: string;
    folderPath?: string; // ✅ Make sure this is here
  };
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

// ❌ DELETE THIS DUPLICATE - You have ProjectState declared twice!
// export interface ProjectState {
//   id: string;
//   name: string;
//   files: ProjectFile[];
//   structure: FileNode[];
//   activeFilePath: string | null;
//   source: string;
//   createdAt: Date;
//   updatedAt: Date;
//   metadata?: { ... }
// }

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
