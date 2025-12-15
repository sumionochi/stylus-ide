"use client";

import { useState, useCallback } from "react";

export interface FileTab {
  id: string;
  name: string;
  content: string;
  language: string;
  isModified: boolean;
}

interface UseFileTabsReturn {
  tabs: FileTab[];
  activeTabId: string | null;
  activeTab: FileTab | null;
  addTab: (name: string, content: string, language?: string) => string;
  removeTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  setActiveTab: (id: string) => void;
  renameTab: (id: string, newName: string) => void;
  getTabsCode: () => Record<string, string>;
}

export function useFileTabs(initialContent?: string): UseFileTabsReturn {
  const [tabs, setTabs] = useState<FileTab[]>([
    {
      id: "main",
      name: "lib.rs",
      content: initialContent || "",
      language: "rust",
      isModified: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("main");

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || null;

  const addTab = useCallback(
    (name: string, content: string = "", language: string = "rust"): string => {
      const id = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newTab: FileTab = {
        id,
        name,
        content,
        language,
        isModified: false,
      };

      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(id);
      return id;
    },
    []
  );

  const removeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const newTabs = prev.filter((tab) => tab.id !== id);

        // If removing active tab, switch to another
        if (id === activeTabId && newTabs.length > 0) {
          const index = prev.findIndex((tab) => tab.id === id);
          const newActiveIndex = index > 0 ? index - 1 : 0;
          setActiveTabId(newTabs[newActiveIndex].id);
        }

        return newTabs.length > 0 ? newTabs : prev; // Keep at least one tab
      });
    },
    [activeTabId]
  );

  const updateTabContent = useCallback((id: string, content: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === id ? { ...tab, content, isModified: true } : tab
      )
    );
  }, []);

  const renameTab = useCallback((id: string, newName: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, name: newName } : tab))
    );
  }, []);

  const getTabsCode = useCallback((): Record<string, string> => {
    return tabs.reduce((acc, tab) => {
      acc[tab.name] = tab.content;
      return acc;
    }, {} as Record<string, string>);
  }, [tabs]);

  return {
    tabs,
    activeTabId,
    activeTab,
    addTab,
    removeTab,
    updateTabContent,
    setActiveTab: setActiveTabId,
    renameTab,
    getTabsCode,
  };
}
