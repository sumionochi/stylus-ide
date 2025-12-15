'use client';

import { Button } from '@/components/ui/button';
import { X, Plus, FileCode } from 'lucide-react';
import type { FileTab } from '@/hooks/useFileTabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FileTabsProps {
  tabs: FileTab[];
  activeTabId: string | null;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewFile: (type: 'rust' | 'toml' | 'markdown') => void;
}

export function FileTabs({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onNewFile,
}: FileTabsProps) {
  return (
    <div className="h-12 border-b border-border flex items-center gap-1 px-2 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-t-md cursor-pointer
            transition-colors group relative
            ${
              activeTabId === tab.id
                ? 'bg-card text-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }
          `}
          onClick={() => onTabClick(tab.id)}
        >
          <span className="text-sm whitespace-nowrap flex items-center gap-1.5">
            <FileCode className="h-3 w-3" />
            {tab.name}
            {tab.isModified && <span className="text-blue-400">•</span>}
          </span>
          
          {tabs.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
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