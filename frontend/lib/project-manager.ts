/**
 * Project Manager
 * Core logic for managing multi-file projects
 */

import { v4 as uuidv4 } from "uuid";
import {
  ProjectFile,
  FileNode,
  ProjectState,
  CreateFileOptions,
  CreateFolderOptions,
  MoveFileOptions,
  RenameOptions,
  FileLanguage,
} from "@/types/project";

/**
 * Create a new empty project
 */
export function createProject(
  name: string,
  source: "local" | "github" = "local"
): ProjectState {
  const now = new Date();

  return {
    id: uuidv4(),
    name,
    type: "stylus-contract", // ✅ ADD THIS LINE
    files: [
      // Default starter files
      createDefaultFile("src/lib.rs", "rust", getDefaultRustContent()),
      createDefaultFile("Cargo.toml", "toml", getDefaultCargoToml(name)),
    ],
    structure: [
      {
        id: uuidv4(),
        name: "src",
        path: "src",
        type: "folder",
        expanded: true,
        children: [
          {
            id: uuidv4(),
            name: "lib.rs",
            path: "src/lib.rs",
            type: "file",
          },
        ],
      },
      {
        id: uuidv4(),
        name: "Cargo.toml",
        path: "Cargo.toml",
        type: "file",
      },
    ],
    activeFilePath: "src/lib.rs",
    source: source,
    createdAt: now,
    updatedAt: now,
    metadata: {
      source,
    },
  };
}

/**
 * Add a new file to the project
 */
export function addFile(
  project: ProjectState,
  options: CreateFileOptions
): ProjectState {
  const { path, content = "", language } = options;

  // Check if file already exists
  if (project.files.find((f) => f.path === path)) {
    throw new Error(`File already exists: ${path}`);
  }

  const fileName = path.split("/").pop() || path;
  const detectedLanguage = language || detectLanguage(fileName);

  const newFile: ProjectFile = {
    id: uuidv4(),
    path,
    name: fileName,
    content,
    language: detectedLanguage,
    modified: false,
    isOpen: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Add file to files array
  const updatedFiles = [...project.files, newFile];

  // Update file tree structure
  const updatedStructure = insertFileIntoTree(project.structure, path);

  return {
    ...project,
    files: updatedFiles,
    structure: updatedStructure,
    updatedAt: new Date(),
  };
}

/**
 * Add a new folder to the project
 */
export function addFolder(
  project: ProjectState,
  options: CreateFolderOptions
): ProjectState {
  const { path } = options;

  // Check if folder already exists
  if (findNodeByPath(project.structure, path)) {
    throw new Error(`Folder already exists: ${path}`);
  }

  const updatedStructure = insertFolderIntoTree(project.structure, path);

  return {
    ...project,
    structure: updatedStructure,
    updatedAt: new Date(),
  };
}

/**
 * Delete a file from the project
 */
export function deleteFile(
  project: ProjectState,
  filePath: string
): ProjectState {
  // Remove from files array
  const updatedFiles = project.files.filter((f) => f.path !== filePath);

  // Remove from tree structure
  const updatedStructure = removeNodeFromTree(project.structure, filePath);

  // If active file was deleted, clear active file
  const activeFilePath =
    project.activeFilePath === filePath ? null : project.activeFilePath;

  return {
    ...project,
    files: updatedFiles,
    structure: updatedStructure,
    activeFilePath,
    updatedAt: new Date(),
  };
}

/**
 * Delete a folder and all its contents
 */
export function deleteFolder(
  project: ProjectState,
  folderPath: string
): ProjectState {
  // Remove all files in folder
  const updatedFiles = project.files.filter(
    (f) => !f.path.startsWith(folderPath + "/")
  );

  // Remove folder from tree
  const updatedStructure = removeNodeFromTree(project.structure, folderPath);

  return {
    ...project,
    files: updatedFiles,
    structure: updatedStructure,
    updatedAt: new Date(),
  };
}

/**
 * Rename a file or folder
 */
export function renameFile(
  project: ProjectState,
  options: RenameOptions
): ProjectState {
  const { oldPath, newPath } = options;

  // Check if new path already exists
  if (project.files.find((f) => f.path === newPath)) {
    throw new Error(`File already exists: ${newPath}`);
  }

  // Update file in files array
  const updatedFiles = project.files.map((file) => {
    if (file.path === oldPath) {
      const newName = newPath.split("/").pop() || newPath;
      return {
        ...file,
        path: newPath,
        name: newName,
        updatedAt: new Date(),
      };
    }
    return file;
  });

  // Update tree structure
  const updatedStructure = renameNodeInTree(
    project.structure,
    oldPath,
    newPath
  );

  // Update active file path if it was renamed
  const activeFilePath =
    project.activeFilePath === oldPath ? newPath : project.activeFilePath;

  return {
    ...project,
    files: updatedFiles,
    structure: updatedStructure,
    activeFilePath,
    updatedAt: new Date(),
  };
}

/**
 * Move a file to a different location
 */
export function moveFile(
  project: ProjectState,
  options: MoveFileOptions
): ProjectState {
  const { fromPath, toPath } = options;

  // This is similar to rename, but handles moving between folders
  return renameFile(project, { oldPath: fromPath, newPath: toPath });
}

/**
 * Get a file by its path
 */
export function getFileByPath(
  project: ProjectState,
  path: string
): ProjectFile | undefined {
  return project.files.find((f) => f.path === path);
}

/**
 * Update file content
 */
export function updateFileContent(
  project: ProjectState,
  filePath: string,
  content: string
): ProjectState {
  const updatedFiles = project.files.map((file) => {
    if (file.path === filePath) {
      return {
        ...file,
        content,
        modified: true,
        updatedAt: new Date(),
      };
    }
    return file;
  });

  return {
    ...project,
    files: updatedFiles,
    updatedAt: new Date(),
  };
}

/**
 * Mark file as saved (not modified)
 */
export function markFileSaved(
  project: ProjectState,
  filePath: string
): ProjectState {
  const updatedFiles = project.files.map((file) => {
    if (file.path === filePath) {
      return {
        ...file,
        modified: false,
      };
    }
    return file;
  });

  return {
    ...project,
    files: updatedFiles,
  };
}

/**
 * Set active file
 */
export function setActiveFile(
  project: ProjectState,
  filePath: string | null
): ProjectState {
  return {
    ...project,
    activeFilePath: filePath,
  };
}

/**
 * Toggle file open state
 */
export function toggleFileOpen(
  project: ProjectState,
  filePath: string,
  isOpen: boolean
): ProjectState {
  const updatedFiles = project.files.map((file) => {
    if (file.path === filePath) {
      return {
        ...file,
        isOpen,
      };
    }
    return file;
  });

  return {
    ...project,
    files: updatedFiles,
  };
}

/**
 * Build file tree structure from flat file list
 */
export function buildFileTree(files: ProjectFile[]): FileNode[] {
  const root: FileNode[] = [];

  files.forEach((file) => {
    const pathParts = file.path.split("/");
    let currentLevel = root;

    pathParts.forEach((part, index) => {
      const isFile = index === pathParts.length - 1;
      const currentPath = pathParts.slice(0, index + 1).join("/");

      let existingNode = currentLevel.find((node) => node.name === part);

      if (!existingNode) {
        const newNode: FileNode = {
          id: uuidv4(),
          name: part,
          path: currentPath,
          type: isFile ? "file" : "folder",
          ...(isFile ? {} : { children: [], expanded: false }),
        };

        currentLevel.push(newNode);
        existingNode = newNode;
      }

      if (!isFile && existingNode.children) {
        currentLevel = existingNode.children;
      }
    });
  });

  return sortTree(root);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createDefaultFile(
  path: string,
  language: FileLanguage,
  content: string
): ProjectFile {
  const name = path.split("/").pop() || path;
  const now = new Date();

  return {
    id: uuidv4(),
    path,
    name,
    content,
    language,
    modified: false,
    isOpen: path === "src/lib.rs", // Open lib.rs by default
    createdAt: now,
    updatedAt: now,
  };
}

function detectLanguage(fileName: string): FileLanguage {
  if (fileName.endsWith(".rs")) return "rust";
  if (fileName.endsWith(".toml")) return "toml";
  if (fileName.endsWith(".md")) return "markdown";
  if (fileName === ".gitignore") return "gitignore";
  return "text";
}

function getDefaultRustContent(): string {
  return `// Welcome to Stylus IDE - Multi-File Project

#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::prelude::*;
use stylus_sdk::alloy_primitives::U256;

sol_storage! {
  #[entrypoint]
  pub struct Counter {
    uint256 count;
  }
}

#[public]
impl Counter {
  pub fn get(&self) -> U256 {
    self.count.get()
  }

  pub fn increment(&mut self) {
    let count = self.count.get();
    self.count.set(count + U256::from(1));
  }
}
`;
}

function getDefaultCargoToml(projectName: string): string {
  return `[package]
name = "${projectName.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}"
version = "0.1.0"
edition = "2021"

[dependencies]
alloy-primitives = "=0.7.6"
alloy-sol-types = "=0.7.6"
stylus-sdk = "0.6.0"

[dev-dependencies]
tokio = { version = "1.12.0", features = ["full"] }
ethers = "2.0"
eyre = "0.6.8"

[features]
export-abi = ["stylus-sdk/export-abi"]

[lib]
crate-type = ["lib", "cdylib"]

[profile.release]
codegen-units = 1
strip = true
lto = true
panic = "abort"
opt-level = "s"
`;
}

function insertFileIntoTree(tree: FileNode[], filePath: string): FileNode[] {
  const pathParts = filePath.split("/");
  const fileName = pathParts.pop()!;

  if (pathParts.length === 0) {
    // Root level file
    return [
      ...tree,
      {
        id: uuidv4(),
        name: fileName,
        path: filePath,
        type: "file",
      },
    ];
  }

  // Nested file - find or create folders
  return tree.map((node) => {
    if (node.name === pathParts[0] && node.type === "folder") {
      const remainingPath = pathParts.slice(1).join("/") + "/" + fileName;
      return {
        ...node,
        children: insertFileIntoTree(node.children || [], remainingPath),
      };
    }
    return node;
  });
}

function insertFolderIntoTree(
  tree: FileNode[],
  folderPath: string
): FileNode[] {
  const pathParts = folderPath.split("/");
  const folderName = pathParts[0];

  const existingFolder = tree.find((node) => node.name === folderName);

  if (pathParts.length === 1) {
    if (existingFolder) {
      return tree;
    }
    return [
      ...tree,
      {
        id: uuidv4(),
        name: folderName,
        path: folderPath,
        type: "folder",
        children: [],
        expanded: false,
      },
    ];
  }

  // Nested folder
  const remainingPath = pathParts.slice(1).join("/");

  if (existingFolder && existingFolder.type === "folder") {
    return tree.map((node) => {
      if (node.name === folderName) {
        return {
          ...node,
          children: insertFolderIntoTree(node.children || [], remainingPath),
        };
      }
      return node;
    });
  }

  // Create parent folder if doesn't exist
  return [
    ...tree,
    {
      id: uuidv4(),
      name: folderName,
      path: pathParts[0],
      type: "folder",
      children: insertFolderIntoTree([], remainingPath),
      expanded: false,
    },
  ];
}

function removeNodeFromTree(tree: FileNode[], path: string): FileNode[] {
  return tree
    .filter((node) => node.path !== path)
    .map((node) => {
      if (node.type === "folder" && node.children) {
        return {
          ...node,
          children: removeNodeFromTree(node.children, path),
        };
      }
      return node;
    });
}

function renameNodeInTree(
  tree: FileNode[],
  oldPath: string,
  newPath: string
): FileNode[] {
  return tree.map((node) => {
    if (node.path === oldPath) {
      const newName = newPath.split("/").pop()!;
      return {
        ...node,
        name: newName,
        path: newPath,
      };
    }

    if (node.type === "folder" && node.children) {
      return {
        ...node,
        children: renameNodeInTree(node.children, oldPath, newPath),
      };
    }

    return node;
  });
}

function findNodeByPath(tree: FileNode[], path: string): FileNode | undefined {
  for (const node of tree) {
    if (node.path === path) {
      return node;
    }

    if (node.type === "folder" && node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }

  return undefined;
}

function sortTree(tree: FileNode[]): FileNode[] {
  return tree
    .sort((a, b) => {
      // Folders first
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    })
    .map((node) => {
      if (node.type === "folder" && node.children) {
        return {
          ...node,
          children: sortTree(node.children),
        };
      }
      return node;
    });
}
