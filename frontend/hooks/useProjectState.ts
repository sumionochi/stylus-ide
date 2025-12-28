"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import { saveProject, loadProject } from "@/lib/storage";

export function useProjectState(initialName: string = "my-stylus-project") {
  // ✅ FIXED: Always start with default project (server + client match)
  const [project, setProject] = useState<ProjectState>(() =>
    createProject(initialName)
  );

  // ✅ FIXED: Track if we've loaded from localStorage
  const [isHydrated, setIsHydrated] = useState(false);

  // ✅ FIXED: Load from localStorage AFTER mount (client-only)
  useEffect(() => {
    if (typeof window !== "undefined" && !isHydrated) {
      const savedProject = loadProject();
      if (savedProject) {
        setProject(savedProject);
      }
      setIsHydrated(true);
    }
  }, [isHydrated]);

  // Auto-save timer refs
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>("");

  // ✅ FIXED: Auto-save only after hydration
  useEffect(() => {
    // Skip if running on server OR not hydrated yet
    if (typeof window === "undefined" || !isHydrated) return;

    // Serialize project for comparison
    const projectSnapshot = JSON.stringify(project);

    // Only save if project actually changed
    if (projectSnapshot !== lastSaveRef.current) {
      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Set new timer (debounce for 2 seconds)
      saveTimerRef.current = setTimeout(() => {
        saveProject(project);
        lastSaveRef.current = projectSnapshot;
        console.log("Project auto-saved");
      }, 2000);
    }

    // Cleanup on unmount
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [project, isHydrated]);

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

  // Duplicate file
  const duplicateFile = useCallback((path: string) => {
    try {
      setProject((prev) => {
        const file = getFileByPath(prev, path);
        if (!file) {
          console.error("File not found:", path);
          return prev;
        }

        const pathParts = path.split("/");
        const fileName = pathParts.pop()!;
        const fileDir = pathParts.join("/");

        const nameParts = fileName.split(".");
        const ext = nameParts.length > 1 ? nameParts.pop() : "";
        const baseName = nameParts.join(".");

        let counter = 1;
        let newName = ext ? `${baseName}_copy.${ext}` : `${baseName}_copy`;
        let newPath = fileDir ? `${fileDir}/${newName}` : newName;

        while (getFileByPath(prev, newPath)) {
          counter++;
          newName = ext
            ? `${baseName}_copy${counter}.${ext}`
            : `${baseName}_copy${counter}`;
          newPath = fileDir ? `${fileDir}/${newName}` : newName;
        }

        return addFile(prev, {
          path: newPath,
          content: file.content,
        });
      });

      return true;
    } catch (error) {
      console.error("Failed to duplicate file:", error);
      return false;
    }
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

  // Manual save function
  const manualSave = useCallback(() => {
    saveProject(project);
    console.log("Project manually saved");
  }, [project]);

  // Reset to new project
  const resetProject = useCallback(() => {
    const newProject = createProject(initialName);
    setProject(newProject);
    saveProject(newProject);
  }, [initialName]);

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
    duplicateFile,
    getCurrentFile,
    getOpenFiles,
    manualSave,
    resetProject,
    isHydrated, // ✅ NEW: Export for debugging
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
