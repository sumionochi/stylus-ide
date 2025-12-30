'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2, XCircle, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GitHubLoadProgress } from '@/lib/github-loader';

interface GitHubLoadingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: GitHubLoadProgress | null;
  onRetry?: () => void;
}

export function GitHubLoadingDialog({
  open,
  onOpenChange,
  progress,
  onRetry,
}: GitHubLoadingDialogProps) {
  const [dots, setDots] = useState('');

  // Animated dots for loading
  useEffect(() => {
    if (progress?.stage === 'downloading-files' || progress?.stage === 'fetching-tree') {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [progress?.stage]);

  const getStageIcon = () => {
    if (!progress) return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;

    switch (progress.stage) {
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  const getStageTitle = () => {
    if (!progress) return 'Loading...';

    switch (progress.stage) {
      case 'validating':
        return 'Validating Repository';
      case 'fetching-tree':
        return 'Fetching Repository Structure';
      case 'downloading-files':
        return 'Downloading Files';
      case 'complete':
        return 'Success!';
      case 'error':
        return 'Error';
      default:
        return 'Loading...';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {progress?.stage === 'error' ? (
              getStageIcon()
            ) : progress?.stage === 'complete' ? (
              getStageIcon()
            ) : (
              <Github className="h-5 w-5 text-muted-foreground" />
            )}
            <DialogTitle>{getStageTitle()}</DialogTitle>
          </div>
          <DialogDescription>
            {progress?.stage === 'complete'
              ? 'Repository loaded successfully'
              : progress?.stage === 'error'
              ? 'Failed to load repository'
              : 'Loading from GitHub...'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          {progress && progress.stage !== 'error' && progress.stage !== 'complete' && (
            <Progress value={progress.progress} className="w-full" />
          )}

          {/* Status Message */}
          {progress && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {progress.message}
                {(progress.stage === 'downloading-files' || progress.stage === 'fetching-tree') &&
                  dots}
              </p>

              {/* File Progress */}
              {progress.filesTotal && progress.filesDownloaded !== undefined && (
                <div className="text-xs text-muted-foreground">
                  {progress.filesDownloaded} / {progress.filesTotal} files downloaded
                </div>
              )}

              {/* Current File */}
              {progress.currentFile && (
                <div className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                  {progress.currentFile}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {progress?.stage === 'error' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{progress.message}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {progress?.stage === 'complete' && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Loaded {progress.filesDownloaded} files successfully
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          {progress?.stage === 'error' && onRetry && (
            <div className="flex gap-2">
              <Button onClick={onRetry} className="flex-1">
                Retry
              </Button>
              <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          )}

          {progress?.stage === 'complete' && (
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Continue to IDE
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}