'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink, Copy, Check } from 'lucide-react';
import { useChainId } from 'wagmi';
import { arbitrum, arbitrumSepolia } from 'wagmi/chains';

interface DeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  onDeploySuccess?: (contractAddress: string, txHash?: string) => void;
}

export function DeployDialog({
  open,
  onOpenChange,
  sessionId,
  onDeploySuccess,
}: DeployDialogProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{
    contractAddress?: string;
    txHash?: string;
    error?: string;
  } | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);

  const chainId = useChainId();

  const getRpcUrl = () => {
    if (chainId === arbitrumSepolia.id) return 'https://sepolia-rollup.arbitrum.io/rpc';
    if (chainId === arbitrum.id) return 'https://arb1.arbitrum.io/rpc';
    return 'https://sepolia-rollup.arbitrum.io/rpc'; // default
  };

  const getExplorerUrl = (address: string) => {
    if (chainId === arbitrumSepolia.id) return `https://sepolia.arbiscan.io/address/${address}`;
    if (chainId === arbitrum.id) return `https://arbiscan.io/address/${address}`;
    return `https://sepolia.arbiscan.io/address/${address}`;
  };

  const getTxExplorerUrl = (txHash: string) => {
    if (chainId === arbitrumSepolia.id) return `https://sepolia.arbiscan.io/tx/${txHash}`;
    if (chainId === arbitrum.id) return `https://arbiscan.io/tx/${txHash}`;
    return `https://sepolia.arbiscan.io/tx/${txHash}`;
  };

  const resetState = () => {
    setPrivateKey('');
    setDeployResult(null);
    setCopiedAddress(false);
    setCopiedTx(false);
  };

  // ✅ Dialog expects (open: boolean)
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  const handleDeploy = async () => {
    if (!sessionId || !privateKey) {
      alert('Please provide a private key');
      return;
    }

    setIsDeploying(true);
    setDeployResult(null);

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          privateKey,
          rpcUrl: getRpcUrl(),
        }),
      });

      const result = await response.json();

      if (result.success && result.contractAddress) {
        setDeployResult({
          contractAddress: result.contractAddress,
          txHash: result.txHash,
        });
        onDeploySuccess?.(result.contractAddress, result.txHash);
      } else {
        setDeployResult({ error: result.error || 'Deployment failed' });
      }
    } catch (error) {
      setDeployResult({
        error: error instanceof Error ? error.message : 'Deployment failed',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'address' | 'tx') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'address') {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } else {
        setCopiedTx(true);
        setTimeout(() => setCopiedTx(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const close = () => handleOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deploy Contract</DialogTitle>
          <DialogDescription>
            Deploy your compiled contract to{' '}
            {chainId === arbitrumSepolia.id ? 'Arbitrum Sepolia' : 'Arbitrum One'}
          </DialogDescription>
        </DialogHeader>

        {!deployResult ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="private-key">Private Key</Label>
              <Input
                id="private-key"
                type="password"
                placeholder="0x..."
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                disabled={isDeploying}
              />
              <p className="text-xs text-muted-foreground">
                ⚠️ Your private key is only used for this deployment and never stored
              </p>
            </div>

            <div className="bg-muted p-3 rounded-md text-xs space-y-1">
              <p className="font-medium">Deployment Details:</p>
              <p>
                Network:{' '}
                {chainId === arbitrumSepolia.id ? 'Arbitrum Sepolia' : 'Arbitrum One'}
              </p>
              <p>RPC: {getRpcUrl()}</p>
            </div>

            <Button
              onClick={handleDeploy}
              disabled={isDeploying || !privateKey || !sessionId}
              className="w-full"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                'Deploy Contract'
              )}
            </Button>
          </div>
        ) : deployResult.error ? (
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md">
              <p className="text-sm text-destructive font-medium mb-2">
                Deployment Failed
              </p>
              <p className="text-xs text-destructive/80">{deployResult.error}</p>
            </div>

            <Button onClick={() => setDeployResult(null)} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-md space-y-3">
              <p className="text-sm text-green-500 font-medium">✓ Deployment Successful!</p>

              {deployResult.contractAddress && (
                <div className="space-y-2">
                  <Label className="text-xs">Contract Address</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted p-2 rounded font-mono break-all">
                      {deployResult.contractAddress}
                    </code>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(deployResult.contractAddress!, 'address')}
                    >
                      {copiedAddress ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>

                    {/* ✅ asChild must wrap an actual <a> */}
                    <Button size="sm" variant="ghost" asChild>
                      <a
                        href={getExplorerUrl(deployResult.contractAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {deployResult.txHash && (
                <div className="space-y-2">
                  <Label className="text-xs">Transaction Hash</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted p-2 rounded font-mono break-all">
                      {deployResult.txHash}
                    </code>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(deployResult.txHash!, 'tx')}
                    >
                      {copiedTx ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>

                    <Button size="sm" variant="ghost" asChild>
                      <a
                        href={getTxExplorerUrl(deployResult.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={close} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
