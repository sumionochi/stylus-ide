"use client";

import { useState, useCallback } from "react";

export interface FileTab {
  id: string;
  name: string;
  content: string;
  language: "rust" | "toml" | "markdown" | "text" | "gitignore";
  path: string; // NEW - Full path for multi-file support
  modified: boolean; // NEW - Track if file has unsaved changes
}

interface UseFileTabsReturn {
  tabs: FileTab[];
  activeTabId: string | null;
  activeTab: FileTab | undefined;
  addTab: (
    name: string,
    content: string,
    language: FileTab["language"],
    path?: string
  ) => string;
  removeTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  setActiveTab: (id: string) => void;
  renameTab: (id: string, newName: string) => void;
  getTabByPath: (path: string) => FileTab | undefined;
  openOrActivateTab: (
    path: string,
    name: string,
    content: string,
    language: FileTab["language"]
  ) => void;
  markTabSaved: (id: string) => void;
  closeTabByPath: (path: string) => void;
}

export function useFileTabs(defaultContent: string = ""): UseFileTabsReturn {
  const [tabs, setTabs] = useState<FileTab[]>([
    {
      id: "default",
      name: "lib.rs",
      content: defaultContent,
      language: "rust",
      path: "src/lib.rs",
      modified: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string | null>("default");

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // Add a new tab
  const addTab = useCallback(
    (
      name: string,
      content: string,
      language: FileTab["language"],
      path?: string
    ): string => {
      const newTab: FileTab = {
        id: `tab-${Date.now()}-${Math.random()}`,
        name,
        content,
        language,
        path: path || name,
        modified: false,
      };

      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
      return newTab.id;
    },
    []
  );

  // Remove a tab
  const removeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((tab) => tab.id !== id);

      // If we removed the active tab, activate another one
      setActiveTabId((currentActive) => {
        if (currentActive === id) {
          return filtered.length > 0 ? filtered[filtered.length - 1].id : null;
        }
        return currentActive;
      });

      return filtered;
    });
  }, []);

  // Update tab content
  const updateTabContent = useCallback((id: string, content: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === id ? { ...tab, content, modified: true } : tab
      )
    );
  }, []);

  // Set active tab
  const setActiveTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  // Rename a tab
  const renameTab = useCallback((id: string, newName: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, name: newName } : tab))
    );
  }, []);

  // Get tab by path (for file tree integration)
  const getTabByPath = useCallback(
    (path: string): FileTab | undefined => {
      return tabs.find((tab) => tab.path === path);
    },
    [tabs]
  );

  // Open or activate existing tab (key function for file tree)
  const openOrActivateTab = useCallback(
    (
      path: string,
      name: string,
      content: string,
      language: FileTab["language"]
    ) => {
      const existingTab = tabs.find((tab) => tab.path === path);

      if (existingTab) {
        // Tab already open, just activate it
        setActiveTabId(existingTab.id);
      } else {
        // Open new tab
        const newTabId = addTab(name, content, language, path);
        setActiveTabId(newTabId);
      }
    },
    [tabs, addTab]
  );

  // Mark tab as saved (remove modified flag)
  const markTabSaved = useCallback((id: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, modified: false } : tab))
    );
  }, []);

  // Close tab by path (for file tree integration)
  const closeTabByPath = useCallback(
    (path: string) => {
      const tab = tabs.find((t) => t.path === path);
      if (tab) {
        removeTab(tab.id);
      }
    },
    [tabs, removeTab]
  );

  return {
    tabs,
    activeTabId,
    activeTab,
    addTab,
    removeTab,
    updateTabContent,
    setActiveTab,
    renameTab,
    getTabByPath,
    openOrActivateTab,
    markTabSaved,
    closeTabByPath,
  };
}
