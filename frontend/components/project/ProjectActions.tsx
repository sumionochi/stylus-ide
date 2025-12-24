'use client';

import { useState, useRef } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { 
  FileDown, 
  FileUp, 
  Save, 
  RotateCcw,
  FolderOpen,
} from 'lucide-react';
import { ProjectState } from '@/types/project';
import { exportProject, importProject, getLastSaveTime } from '@/lib/storage';

interface ProjectActionsProps {
  project: ProjectState;
  onImport: (project: ProjectState) => void;
  onReset: () => void;
  onSave: () => void;
}

export function ProjectActions({
  project,
  onImport,
  onReset,
  onSave,
}: ProjectActionsProps) {
  const [showResetDialog, setShowResetDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSave = getLastSaveTime();

  const handleExport = () => {
    exportProject(project);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedProject = await importProject(file);
      onImport(importedProject);
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to import project');
    }
  };

  const formatLastSave = () => {
    if (!lastSave) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastSave.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return lastSave.toLocaleDateString();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden md:inline">Project</span>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          {/* <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {project.name}
          </div> */}
          {/* <div className="px-2 pb-2 text-xs text-muted-foreground">
            Last saved: {formatLastSave()}
          </div> */}
          
          {/* <DropdownMenuSeparator /> */}
          
          <DropdownMenuItem onClick={onSave} className="cursor-pointer">
            <Save className="h-4 w-4 mr-2" />
            Save Now
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
            <FileDown className="h-4 w-4 mr-2" />
            Export Project
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleImportClick} className="cursor-pointer">
            <FileUp className="h-4 w-4 mr-2" />
            Import Project
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setShowResetDialog(true)}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Reset confirmation dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all files and reset to a new empty project.
              <br />
              <br />
              <strong>This action cannot be undone.</strong>
              <br />
              Consider exporting your project first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onReset();
                setShowResetDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Reset Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}