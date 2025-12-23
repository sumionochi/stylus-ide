'use client';

import { useState } from 'react';
import { FileNode as FileNodeType } from '@/types/project';
import { FileNode } from './FileNode';
import { FolderNode } from './FolderNode';
import { Button } from '@/components/ui/button';
import { Plus, FolderPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileTreeProps {
  structure: FileNodeType[];
  activeFilePath: string | null;
  onFileClick: (path: string) => void;
  onFolderToggle: (path: string, expanded: boolean) => void;
  onNewFile?: () => void;
  onNewFolder?: () => void;
  className?: string;
}

export function FileTree({
  structure,
  activeFilePath,
  onFileClick,
  onFolderToggle,
  onNewFile,
  onNewFolder,
  className = '',
}: FileTreeProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: FileNodeType | null;
  } | null>(null);

  const handleContextMenu = (
    e: React.MouseEvent,
    node: FileNodeType | null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <div
      className={`flex flex-col h-full border-r border-border bg-card ${className}`}
      onContextMenu={(e) => handleContextMenu(e, null)}
      onClick={closeContextMenu}
    >
      {/* Header */}
      <div className="h-10 border-b border-border flex items-center justify-between px-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase">
          Files
        </span>
        
        <div className="flex items-center gap-1">
          {onNewFile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onNewFile}
              title="New File"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          
          {onNewFolder && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onNewFolder}
              title="New Folder"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* File Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {structure.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8">
              No files yet. Create a new file to get started.
            </div>
          ) : (
            <div className="space-y-0.5">
              {structure.map((node) => (
                node.type === 'folder' ? (
                  <FolderNode
                    key={node.id}
                    node={node}
                    activeFilePath={activeFilePath}
                    onFileClick={onFileClick}
                    onFolderToggle={onFolderToggle}
                    onContextMenu={handleContextMenu}
                    depth={0}
                  />
                ) : (
                  <FileNode
                    key={node.id}
                    node={node}
                    isActive={node.path === activeFilePath}
                    onClick={() => onFileClick(node.path)}
                    onContextMenu={handleContextMenu}
                    depth={0}
                  />
                )
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Context Menu will go here in Step 1.5 */}
    </div>
  );
}