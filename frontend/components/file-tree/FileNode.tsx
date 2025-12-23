'use client';

import { FileNode as FileNodeType } from '@/types/project';
import { FileCode, FileText, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileNodeProps {
  node: FileNodeType;
  isActive: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent, node: FileNodeType) => void;
  depth: number;
}

export function FileNode({
  node,
  isActive,
  onClick,
  onContextMenu,
  depth,
}: FileNodeProps) {
  const paddingLeft = depth * 12 + 8; // Indent based on depth

  const getFileIcon = () => {
    const name = node.name.toLowerCase();
    
    if (name.endsWith('.rs')) {
      return <FileCode className="h-4 w-4 text-orange-500" />;
    }
    
    if (name.endsWith('.toml')) {
      return <FileText className="h-4 w-4 text-blue-500" />;
    }
    
    if (name.endsWith('.md')) {
      return <FileText className="h-4 w-4 text-gray-500" />;
    }
    
    return <File className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm',
        'hover:bg-accent transition-colors select-none',
        isActive && 'bg-accent text-accent-foreground font-medium'
      )}
      style={{ paddingLeft: `${paddingLeft}px` }}
      onClick={onClick}
      onContextMenu={(e) => onContextMenu(e, node)}
    >
      {getFileIcon()}
      <span className="truncate">{node.name}</span>
    </div>
  );
}