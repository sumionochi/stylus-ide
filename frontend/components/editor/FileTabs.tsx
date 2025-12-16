'use client';

import { Button } from '@/components/ui/button';
import { X, Plus, FileCode, Edit2, MoreHorizontal } from 'lucide-react';
import type { FileTab } from '@/hooks/useFileTabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

interface FileTabsProps {
  tabs: FileTab[];
  activeTabId: string | null;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewFile: (type: 'rust' | 'toml' | 'markdown') => void;
  onRenameTab?: (id: string, newName: string) => void;
}

export function FileTabs({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onNewFile,
  onRenameTab,
}: FileTabsProps) {
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleRename = (tabId: string, currentName: string) => {
    setRenamingTabId(tabId);
    setRenameValue(currentName);
  };

  const handleRenameSubmit = (tabId: string) => {
    if (onRenameTab && renameValue.trim() && renameValue !== tabs.find(t => t.id === tabId)?.name) {
      onRenameTab(tabId, renameValue.trim());
    }
    setRenamingTabId(null);
    setRenameValue('');
  };

  const handleRenameCancel = () => {
    setRenamingTabId(null);
    setRenameValue('');
  };

  const isRenameable = (tab: FileTab) => {
    // Allow renaming for new files (not the main lib.rs)
    return tab.id !== 'main' && onRenameTab;
  };

  return (
    <div className="h-12 border-b border-border flex items-center gap-1 px-2 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-t-md
            transition-colors group relative
            ${activeTabId === tab.id
              ? 'bg-card text-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }
          `}
        >
          <div
            className="flex items-center gap-1.5 cursor-pointer"
            onClick={() => onTabClick(tab.id)}
          >
            <FileCode className="h-3 w-3" />
            {renamingTabId === tab.id ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSubmit(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameSubmit(tab.id);
                  } else if (e.key === 'Escape') {
                    handleRenameCancel();
                  }
                }}
                className="text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-1 min-w-0 w-20"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm whitespace-nowrap">
                {tab.name}
                {tab.isModified && <span className="text-blue-400 ml-1">•</span>}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
            {isRenameable(tab) && renamingTabId !== tab.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleRename(tab.id, tab.name)}>
                    <Edit2 className="h-3 w-3 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  {tabs.length > 1 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onTabClose(tab.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <X className="h-3 w-3 mr-2" />
                        Close
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {tabs.length > 1 && !isRenameable(tab) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* New File Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 ml-2"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onNewFile('rust')}>
            <FileCode className="h-4 w-4 mr-2" />
            New Rust File
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onNewFile('toml')}>
            <FileCode className="h-4 w-4 mr-2" />
            New TOML File
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onNewFile('markdown')}>
            <FileCode className="h-4 w-4 mr-2" />
            New Markdown File
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}