"use client";

import { useState, useCallback } from "react";
import { ProjectState, FileNode } from "@/types/project";
import {
  createProject,
  addFile,
  addFolder,
  deleteFile,
  deleteFolder,
  renameFile,
  updateFileContent,
  setActiveFile,
  toggleFileOpen,
  getFileByPath,
} from "@/lib/project-manager";

export function useProjectState(initialName: string = "my-stylus-project") {
  const [project, setProject] = useState<ProjectState>(() =>
    createProject(initialName)
  );

  // Create new file
  const createNewFile = useCallback((path: string, content?: string) => {
    try {
      setProject((prev) => addFile(prev, { path, content }));
      return true;
    } catch (error) {
      console.error("Failed to create file:", error);
      return false;
    }
  }, []);

  // Create new folder
  const createNewFolder = useCallback((path: string) => {
    try {
      setProject((prev) => addFolder(prev, { path }));
      return true;
    } catch (error) {
      console.error("Failed to create folder:", error);
      return false;
    }
  }, []);

  // Delete file
  const removeFile = useCallback((path: string) => {
    try {
      setProject((prev) => deleteFile(prev, path));
      return true;
    } catch (error) {
      console.error("Failed to delete file:", error);
      return false;
    }
  }, []);

  // Delete folder
  const removeFolder = useCallback((path: string) => {
    try {
      setProject((prev) => deleteFolder(prev, path));
      return true;
    } catch (error) {
      console.error("Failed to delete folder:", error);
      return false;
    }
  }, []);

  // Rename file/folder
  const rename = useCallback((oldPath: string, newPath: string) => {
    try {
      setProject((prev) => renameFile(prev, { oldPath, newPath }));
      return true;
    } catch (error) {
      console.error("Failed to rename:", error);
      return false;
    }
  }, []);

  // Update file content
  const updateContent = useCallback((path: string, content: string) => {
    setProject((prev) => updateFileContent(prev, path, content));
  }, []);

  // Set active file
  const setActive = useCallback((path: string | null) => {
    setProject((prev) => {
      let updated = setActiveFile(prev, path);

      // Also mark file as open if setting active
      if (path) {
        updated = toggleFileOpen(updated, path, true);
      }

      return updated;
    });
  }, []);

  // Close file (remove from tabs)
  const closeFile = useCallback((path: string) => {
    setProject((prev) => {
      let updated = toggleFileOpen(prev, path, false);

      // If closing active file, set active to null
      if (prev.activeFilePath === path) {
        updated = setActiveFile(updated, null);
      }

      return updated;
    });
  }, []);

  // Toggle folder expansion
  const toggleFolder = useCallback((path: string, expanded: boolean) => {
    setProject((prev) => ({
      ...prev,
      structure: updateFolderExpansion(prev.structure, path, expanded),
    }));
  }, []);

  // Get current file content
  const getCurrentFile = useCallback(() => {
    if (!project.activeFilePath) return null;
    return getFileByPath(project, project.activeFilePath);
  }, [project]);

  // Get all open files
  const getOpenFiles = useCallback(() => {
    return project.files.filter((f) => f.isOpen);
  }, [project.files]);

  return {
    project,
    setProject,
    createNewFile,
    createNewFolder,
    removeFile,
    removeFolder,
    rename,
    updateContent,
    setActive,
    closeFile,
    toggleFolder,
    getCurrentFile,
    getOpenFiles,
  };
}

// Helper to update folder expansion in tree
function updateFolderExpansion(
  structure: FileNode[],
  path: string,
  expanded: boolean
): FileNode[] {
  return structure.map((node) => {
    if (node.path === path && node.type === "folder") {
      return { ...node, expanded };
    }

    if (node.type === "folder" && node.children) {
      return {
        ...node,
        children: updateFolderExpansion(node.children, path, expanded),
      };
    }

    return node;
  });
}
