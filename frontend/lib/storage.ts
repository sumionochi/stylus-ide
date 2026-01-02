/**
 * LocalStorage utilities for project persistence
 */

import { ProjectState } from "@/types/project";

const STORAGE_KEYS = {
  CURRENT_PROJECT: "stylus-ide-current-project",
  PROJECT_LIST: "stylus-ide-projects",
  LAST_SAVE: "stylus-ide-last-save",
} as const;

/**
 * Save current project to localStorage
 */
export function saveProject(project: ProjectState): void {
  try {
    const projectData = JSON.stringify(project);
    localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, projectData);
    localStorage.setItem(STORAGE_KEYS.LAST_SAVE, new Date().toISOString());
  } catch (error) {
    console.error("Failed to save project:", error);

    // Handle quota exceeded
    if (error instanceof Error && error.name === "QuotaExceededError") {
      alert(
        "Storage quota exceeded. Please clear old projects or export your work."
      );
    }
  }
}

/**
 * Load current project from localStorage
 */
export function loadProject(): ProjectState | null {
  try {
    const projectData = localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT);

    if (!projectData) {
      return null;
    }

    const project = JSON.parse(projectData) as ProjectState;

    // Validate the loaded project has required fields
    if (!project.id || !project.files || !project.structure) {
      console.warn("Invalid project data in localStorage");
      return null;
    }

    // Convert date strings back to Date objects
    project.createdAt = new Date(project.createdAt);
    project.updatedAt = new Date(project.updatedAt);
    project.files = project.files.map((file) => ({
      ...file,
      createdAt: new Date(file.createdAt),
      updatedAt: new Date(file.updatedAt),
    }));

    return project;
  } catch (error) {
    console.error("Failed to load project:", error);
    return null;
  }
}

/**
 * Clear current project from localStorage
 */
export function clearProject(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT);
    localStorage.removeItem(STORAGE_KEYS.LAST_SAVE);
  } catch (error) {
    console.error("Failed to clear project:", error);
  }
}

/**
 * Get last save timestamp
 */
export function getLastSaveTime(): Date | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const timestamp = localStorage.getItem(STORAGE_KEYS.LAST_SAVE);
    return timestamp ? new Date(timestamp) : null;
  } catch (error) {
    console.error("Failed to get last save time:", error);
    return null;
  }
}

/**
 * Export project as JSON file
 */
export function exportProject(project: ProjectState): void {
  try {
    const projectData = JSON.stringify(project, null, 2);
    const blob = new Blob([projectData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.name}-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export project:", error);
    alert("Failed to export project. Please try again.");
  }
}

/**
 * Import project from JSON file
 */
export function importProject(file: File): Promise<ProjectState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const project = JSON.parse(content) as ProjectState;

        // Validate imported project
        if (!project.id || !project.files || !project.structure) {
          throw new Error("Invalid project file");
        }

        // Convert date strings to Date objects
        project.createdAt = new Date(project.createdAt);
        project.updatedAt = new Date(project.updatedAt);
        project.files = project.files.map((file) => ({
          ...file,
          createdAt: new Date(file.createdAt),
          updatedAt: new Date(file.updatedAt),
        }));

        resolve(project);
      } catch (error) {
        reject(new Error("Failed to parse project file"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

/**
 * Get storage usage info
 */
export function getStorageInfo(): {
  used: number;
  total: number;
  percentage: number;
} {
  try {
    let used = 0;

    // Calculate total size of localStorage
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }

    // Most browsers have ~5-10MB limit for localStorage
    const total = 5 * 1024 * 1024; // 5MB estimate
    const percentage = (used / total) * 100;

    return { used, total, percentage };
  } catch (error) {
    console.error("Failed to get storage info:", error);
    return { used: 0, total: 0, percentage: 0 };
  }
}
