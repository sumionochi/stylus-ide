'use client';

import { useState } from 'react';
import { FileNode as FileNodeType } from '@/types/project';
import { FileNode } from './FileNode';
import { FolderNode } from './FolderNode';
import { FileTreeContextMenu } from './ContextMenu';
import { FileInputDialog } from './FileInputDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Button } from '@/components/ui/button';
import { Plus, FolderPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileTreeProps {
  structure: FileNodeType[];
  activeFilePath: string | null;
  onFileClick: (path: string) => void;
  onFolderToggle: (path: string, expanded: boolean) => void;
  onNewFile?: (parentPath?: string) => void;
  onNewFolder?: (parentPath?: string) => void;
  onRename?: (oldPath: string, newName: string) => void;
  onDuplicate?: (path: string) => void;
  onDelete?: (path: string, isFolder: boolean) => void;
  className?: string;
}

export function FileTree({
  structure,
  activeFilePath,
  onFileClick,
  onFolderToggle,
  onNewFile,
  onNewFolder,
  onRename,
  onDuplicate,
  onDelete,
  className = '',
}: FileTreeProps) {
  const [contextNode, setContextNode] = useState<FileNodeType | null>(null);
  
  // Dialog states
  const [newFileDialog, setNewFileDialog] = useState<{
    open: boolean;
    parentPath?: string;
  }>({ open: false });
  
  const [newFolderDialog, setNewFolderDialog] = useState<{
    open: boolean;
    parentPath?: string;
  }>({ open: false });
  
  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    path?: string;
    currentName?: string;
  }>({ open: false });
  
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    path?: string;
    name?: string;
    isFolder?: boolean;
  }>({ open: false });

  // Context menu handlers
  const handleNewFile = (parentPath?: string) => {
    setNewFileDialog({ open: true, parentPath });
  };

  const handleNewFolder = (parentPath?: string) => {
    setNewFolderDialog({ open: true, parentPath });
  };

  const handleRename = (path: string) => {
    const pathParts = path.split('/');
    const currentName = pathParts[pathParts.length - 1];
    setRenameDialog({ open: true, path, currentName });
  };

  const handleDuplicate = (path: string) => {
    onDuplicate?.(path);
  };

  const handleDelete = (path: string, isFolder: boolean) => {
    const pathParts = path.split('/');
    const name = pathParts[pathParts.length - 1];
    setDeleteDialog({ open: true, path, name, isFolder });
  };

  // Dialog confirm handlers
  const confirmNewFile = (name: string) => {
    const fullPath = newFileDialog.parentPath
      ? `${newFileDialog.parentPath}/${name}`
      : name;
    onNewFile?.(fullPath);
  };

  const confirmNewFolder = (name: string) => {
    const fullPath = newFolderDialog.parentPath
      ? `${newFolderDialog.parentPath}/${name}`
      : name;
    onNewFolder?.(fullPath);
  };

  const confirmRename = (newName: string) => {
    if (renameDialog.path) {
      onRename?.(renameDialog.path, newName);
    }
  };

  const confirmDelete = () => {
    if (deleteDialog.path !== undefined && deleteDialog.isFolder !== undefined) {
      onDelete?.(deleteDialog.path, deleteDialog.isFolder);
    }
  };

  return (
    <>
      <FileTreeContextMenu
        node={null}
        onNewFile={handleNewFile}
        onNewFolder={handleNewFolder}
        onRename={handleRename}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      >
        <div className={`flex flex-col h-full border-r border-border bg-card ${className}`}>
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
                  onClick={() => handleNewFile()}
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
                  onClick={() => handleNewFolder()}
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
                      <FileTreeContextMenu
                        key={node.id}
                        node={node}
                        onNewFile={handleNewFile}
                        onNewFolder={handleNewFolder}
                        onRename={handleRename}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                      >
                        <div>
                          <FolderNode
                            node={node}
                            activeFilePath={activeFilePath}
                            onFileClick={onFileClick}
                            onFolderToggle={onFolderToggle}
                            onContextMenu={() => setContextNode(node)}
                            depth={0}
                          />
                        </div>
                      </FileTreeContextMenu>
                    ) : (
                      <FileTreeContextMenu
                        key={node.id}
                        node={node}
                        onNewFile={handleNewFile}
                        onNewFolder={handleNewFolder}
                        onRename={handleRename}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                      >
                        <div>
                          <FileNode
                            node={node}
                            isActive={node.path === activeFilePath}
                            onClick={() => onFileClick(node.path)}
                            onContextMenu={() => setContextNode(node)}
                            depth={0}
                          />
                        </div>
                      </FileTreeContextMenu>
                    )
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </FileTreeContextMenu>

      {/* Dialogs */}
      <FileInputDialog
        open={newFileDialog.open}
        onOpenChange={(open) => setNewFileDialog({ open })}
        title="New File"
        description="Enter the name for the new file (e.g., utils.rs)"
        placeholder="filename.rs"
        onConfirm={confirmNewFile}
      />

      <FileInputDialog
        open={newFolderDialog.open}
        onOpenChange={(open) => setNewFolderDialog({ open })}
        title="New Folder"
        description="Enter the name for the new folder"
        placeholder="folder-name"
        onConfirm={confirmNewFolder}
      />

      <FileInputDialog
        open={renameDialog.open}
        onOpenChange={(open) => setRenameDialog({ open })}
        title="Rename"
        description="Enter the new name"
        defaultValue={renameDialog.currentName}
        placeholder="new-name"
        onConfirm={confirmRename}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open })}
        itemName={deleteDialog.name || ''}
        isFolder={deleteDialog.isFolder || false}
        onConfirm={confirmDelete}
      />
    </>
  );
}