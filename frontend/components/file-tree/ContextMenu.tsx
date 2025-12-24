'use client';

import { useEffect, useCallback } from 'react';
import { FileNode } from '@/types/project';
import {
  ContextMenu as ContextMenuPrimitive,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  FilePlus,
  FolderPlus,
  Pencil,
  Copy,
  Trash2,
} from 'lucide-react';

interface ContextMenuProps {
  node: FileNode | null;
  onNewFile: (parentPath?: string) => void;
  onNewFolder: (parentPath?: string) => void;
  onRename: (path: string) => void;
  onDuplicate: (path: string) => void;
  onDelete: (path: string, isFolder: boolean) => void;
  children: React.ReactNode;
}

export function FileTreeContextMenu({
  node,
  onNewFile,
  onNewFolder,
  onRename,
  onDuplicate,
  onDelete,
  children,
}: ContextMenuProps) {
  const isFolder = node?.type === 'folder';
  const isFile = node?.type === 'file';

  return (
    <ContextMenuPrimitive>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-56">
        {/* New File/Folder - Available for folders and empty space */}
        {(isFolder || !node) && (
          <>
            <ContextMenuItem
              onClick={() => onNewFile(node?.path)}
              className="cursor-pointer"
            >
              <FilePlus className="h-4 w-4 mr-2" />
              New File
            </ContextMenuItem>
            
            <ContextMenuItem
              onClick={() => onNewFolder(node?.path)}
              className="cursor-pointer"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </ContextMenuItem>
            
            {node && <ContextMenuSeparator />}
          </>
        )}

        {/* File-specific actions */}
        {isFile && (
          <>
            <ContextMenuItem
              onClick={() => onDuplicate(node.path)}
              className="cursor-pointer"
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </ContextMenuItem>
            
            <ContextMenuSeparator />
          </>
        )}

        {/* Rename & Delete - Available for both files and folders */}
        {node && (
          <>
            <ContextMenuItem
              onClick={() => onRename(node.path)}
              className="cursor-pointer"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </ContextMenuItem>
            
            <ContextMenuItem
              onClick={() => onDelete(node.path, isFolder)}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenuPrimitive>
  );
}