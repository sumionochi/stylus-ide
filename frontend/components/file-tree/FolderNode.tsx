'use client';

import { useState } from 'react';
import { FileNode as FileNodeType } from '@/types/project';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { FileNode } from './FileNode';
import { FileTreeContextMenu } from './ContextMenu';
import { cn } from '@/lib/utils';

interface FolderNodeProps {
  node: FileNodeType;
  activeFilePath: string | null;
  onFileClick: (path: string) => void;
  onFolderToggle: (path: string, expanded: boolean) => void;
  onContextMenu: () => void;
  depth: number;
}

export function FolderNode({
  node,
  activeFilePath,
  onFileClick,
  onFolderToggle,
  onContextMenu,
  depth,
}: FolderNodeProps) {
  const [isExpanded, setIsExpanded] = useState(node.expanded || false);
  const paddingLeft = depth * 12 + 8;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onFolderToggle(node.path, newExpanded);
  };

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      {/* Folder Header */}
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm',
          'hover:bg-accent transition-colors'
        )}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={handleToggle}
        onContextMenu={(e) => {
          e.stopPropagation();
          onContextMenu();
        }}
      >
        {/* Chevron */}
        <div className="flex items-center justify-center w-4 h-4">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )
          ) : null}
        </div>

        {/* Folder Icon */}
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 text-blue-500" />
        ) : (
          <Folder className="h-4 w-4 text-blue-500" />
        )}

        {/* Folder Name */}
        <span className="truncate">{node.name}</span>
      </div>

      {/* Children (when expanded) */}
      {isExpanded && hasChildren && (
        <div className="space-y-0.5">
          {node.children!.map((childNode) => (
            childNode.type === 'folder' ? (
              <FolderNode
                key={childNode.id}
                node={childNode}
                activeFilePath={activeFilePath}
                onFileClick={onFileClick}
                onFolderToggle={onFolderToggle}
                onContextMenu={onContextMenu}
                depth={depth + 1}
              />
            ) : (
              <FileNode
                key={childNode.id}
                node={childNode}
                isActive={childNode.path === activeFilePath}
                onClick={() => onFileClick(childNode.path)}
                onContextMenu={onContextMenu}
                depth={depth + 1}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}