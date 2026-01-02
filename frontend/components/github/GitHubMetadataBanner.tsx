'use client';

import { ExternalLink, Github, GitBranch, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { URLCopyButton } from './URLCopyButton';

interface GitHubMetadataBannerProps {
  owner: string;
  repo: string;
  branch: string;
  url: string;
  folderPath?: string;  // ✅ ADD THIS
}

export function GitHubMetadataBanner({ 
  owner, 
  repo, 
  branch, 
  url,
  folderPath  // ✅ ADD THIS
}: GitHubMetadataBannerProps) {
  return (
    <div className="h-8 border-b border-border bg-blue-500/10 flex items-center justify-between px-4 text-xs">
      <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
        <div className="flex items-center gap-1.5">
          <Github className="h-3.5 w-3.5" />
          <span className="font-medium">{owner}/{repo}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <GitBranch className="h-3 w-3" />
          <span>{branch}</span>
        </div>
        {/* ✅ NEW: Show folder path if loading specific folder */}
        {folderPath && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Folder className="h-3 w-3" />
            <span>/{folderPath}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
      {/* ✅ NEW: Share button */}
      <URLCopyButton
          githubUrl={url}
          branch={branch}
          folderPath={folderPath}
        />
      
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs gap-1"
        onClick={() => window.open(url, '_blank')}
      >
        View on GitHub
        <ExternalLink className="h-3 w-3" />
      </Button>
    </div>
    </div>
  );
}