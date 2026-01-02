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
import { CheckCircle2, Loader2, XCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BlockchainLoadProgress } from '@/lib/blockchain-loader';

interface BlockchainLoadingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: BlockchainLoadProgress | null;
  onRetry?: () => void;
}

export function BlockchainLoadingDialog({
  open,
  onOpenChange,
  progress,
  onRetry,
}: BlockchainLoadingDialogProps) {
  const [dots, setDots] = useState('');

  // Animated dots for loading
  useEffect(() => {
    if (progress?.stage === 'fetching' || progress?.stage === 'parsing') {
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
        return 'Validating Contract';
      case 'fetching':
        return 'Fetching Contract Data';
      case 'parsing':
        return 'Extracting ABI';
      case 'complete':
        return 'Ready to Interact!';
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
              <Shield className="h-5 w-5 text-muted-foreground" />
            )}
            <DialogTitle>{getStageTitle()}</DialogTitle>
          </div>
          <DialogDescription>
            {progress?.stage === 'complete'
              ? 'Contract is ready for interaction'
              : progress?.stage === 'error'
              ? 'Failed to load contract'
              : 'Loading contract from blockchain...'}
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
                {(progress.stage === 'fetching' || progress.stage === 'parsing') && dots}
              </p>

              {/* Contract Name Display */}
              {progress.contractName && progress.stage !== 'complete' && (
                <div className="text-xs font-medium text-foreground">
                  Contract: {progress.contractName}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {progress?.stage === 'error' && (
            <div className="space-y-3">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="whitespace-pre-wrap">
                  {progress.message}
                </AlertDescription>
              </Alert>

              {/* Help text for common errors */}
              {progress.message.includes('API key') && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold">To add an API key:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Get a free API key from the explorer</li>
                    <li>Add NEXT_PUBLIC_ETHERSCAN_API_KEY to .env.local</li>
                    <li>Restart your dev server</li>
                  </ol>
                </div>
              )}

              {progress.message.includes('not verified') && (
                <div className="text-xs text-muted-foreground">
                  <p>This contract has not been verified on the blockchain explorer.</p>
                  <p className="mt-1">Only verified contracts can be loaded.</p>
                </div>
              )}

              {progress.message.includes('Network error') && (
                <div className="text-xs text-muted-foreground">
                  <p>Check your internet connection and try again.</p>
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {progress?.stage === 'complete' && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {progress.contractName || 'Contract'} is ready for interaction
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
              Start Interacting
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}