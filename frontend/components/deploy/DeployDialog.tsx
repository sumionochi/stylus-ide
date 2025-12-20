'use client';

import { useEffect, useMemo, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ExternalLink, Copy, Check } from 'lucide-react';
import { useChainId } from 'wagmi';
import { arbitrum, arbitrumSepolia } from 'wagmi/chains';
import { orbitChains } from '@/lib/orbit-chains';

interface DeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  onDeploySuccess?: (contractAddress: string, txHash?: string) => void;
}

type RpcOption = { name: string; url: string };

// Arbitrum RPCs
const ARBITRUM_SEPOLIA_RPCS: RpcOption[] = [
  { name: 'Arbitrum Official', url: 'https://sepolia-rollup.arbitrum.io/rpc' },
  // ⚠️ demo is rate-limited — replace with your own key
  { name: 'Alchemy (demo - rate limited)', url: 'https://arb-sepolia.g.alchemy.com/v2/demo' },
  { name: 'Chainstack', url: 'https://arbitrum-sepolia.core.chainstack.com/rpc/demo' },
  { name: 'Public Node', url: 'https://arbitrum-sepolia-rpc.publicnode.com' },
];

const ARBITRUM_ONE_RPCS: RpcOption[] = [
  { name: 'Arbitrum Official', url: 'https://arb1.arbitrum.io/rpc' },
  { name: 'Alchemy (demo - rate limited)', url: 'https://arb-mainnet.g.alchemy.com/v2/demo' },
];

// Orbit RPCs (public/free where available)
const ORBIT_RPCS_BY_CHAIN_ID: Record<number, RpcOption[]> = {
  // Xai Testnet v2 (37714555429)
  37714555429: [
    { name: 'Xai Official', url: 'https://testnet-v2.xai-chain.net/rpc' },
    { name: 'Ankr (public)', url: 'https://rpc.ankr.com/xai_testnet' },
    { name: 'thirdweb (public)', url: 'https://37714555429.rpc.thirdweb.com' },
    // Note: this endpoint may be rate-limited depending on provider policy
    { name: 'QuickNode (public)', url: 'https://xai-testnet.rpc.quicknode.com' },
  ],

  // ApeChain Curtis Testnet (33111)
  33111: [
    { name: 'Caldera (official)', url: 'https://curtis.rpc.caldera.xyz/http' },
    { name: 'ApeChain (Chainlist RPC)', url: 'https://rpc.curtis.apechain.com' },
    { name: 'dRPC (public)', url: 'https://apechain-curtis.drpc.org' },
    { name: 'thirdweb (public)', url: 'https://33111.rpc.thirdweb.com' },
    // Keeping Tenderly as optional; if it fails for writes, use Caldera/ApeChain RPC
    { name: 'Tenderly Gateway (may be limited)', url: 'https://curtis.gateway.tenderly.co' },
  ],

  // Nitrogen (Orbit Celestia) Testnet (96384675468)
  96384675468: [
    { name: 'AltLayer (official)', url: 'https://nitrogen-rpc.altlayer.io' },
  ],
};

export function DeployDialog({
  open,
  onOpenChange,
  sessionId,
  onDeploySuccess,
}: DeployDialogProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [selectedRpc, setSelectedRpc] = useState<string>('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{
    contractAddress?: string;
    txHash?: string;
    error?: string;
  } | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);

  const chainId = useChainId();

  const orbitInfo = useMemo(() => orbitChains.find((c) => c.id === chainId), [chainId]);

  const chainDisplayName = useMemo(() => {
    if (chainId === arbitrumSepolia.id) return 'Arbitrum Sepolia';
    if (chainId === arbitrum.id) return 'Arbitrum One';
    return orbitInfo?.name ?? `Chain ${chainId}`;
  }, [chainId, orbitInfo]);

  const availableRpcs: RpcOption[] = useMemo(() => {
    if (chainId === arbitrumSepolia.id) return ARBITRUM_SEPOLIA_RPCS;
    if (chainId === arbitrum.id) return ARBITRUM_ONE_RPCS;

    // Orbit chain specific list
    const orbitRpcs = ORBIT_RPCS_BY_CHAIN_ID[chainId];
    if (orbitRpcs?.length) return orbitRpcs;

    // Fallback: if chain is in orbitChains, at least show its default rpcUrls
    if (orbitInfo?.chain?.rpcUrls?.default?.http?.length) {
      return orbitInfo.chain.rpcUrls.default.http.map((url, idx) => ({
        name: idx === 0 ? 'Default (from chain config)' : `RPC ${idx + 1}`,
        url,
      }));
    }

    return [];
  }, [chainId, orbitInfo]);

  // ✅ Set default RPC safely (no setState during render)
  useEffect(() => {
    setSelectedRpc((prev) => {
      if (prev && availableRpcs.some((r) => r.url === prev)) return prev;
      return availableRpcs[0]?.url ?? '';
    });
  }, [availableRpcs]);

  const explorerBase = useMemo(() => {
    if (chainId === arbitrumSepolia.id) return 'https://sepolia.arbiscan.io';
    if (chainId === arbitrum.id) return 'https://arbiscan.io';

    const url = orbitInfo?.chain?.blockExplorers?.default?.url;
    return url ? url.replace(/\/$/, '') : null;
  }, [chainId, orbitInfo]);

  const getExplorerUrl = (address: string) => {
    const base = explorerBase ?? 'https://sepolia.arbiscan.io';
    return `${base}/address/${address}`;
  };

  const getTxExplorerUrl = (txHash: string) => {
    const base = explorerBase ?? 'https://sepolia.arbiscan.io';
    return `${base}/tx/${txHash}`;
  };

  const reset = () => {
    setPrivateKey('');
    setDeployResult(null);
    setCopiedAddress(false);
    setCopiedTx(false);
  };

  // ✅ Dialog expects (open:boolean). Reset only on close.
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleDeploy = async () => {
    if (!sessionId || !privateKey || !selectedRpc) {
      alert('Please provide a private key and select an RPC endpoint');
      return;
    }

    setIsDeploying(true);
    setDeployResult(null);

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, privateKey, rpcUrl: selectedRpc }),
      });

      const result = await response.json();

      if (result.success && result.contractAddress) {
        setDeployResult({ contractAddress: result.contractAddress, txHash: result.txHash });
        onDeploySuccess?.(result.contractAddress, result.txHash);
      } else {
        setDeployResult({ error: result.error || 'Deployment failed' });
      }
    } catch (error) {
      setDeployResult({ error: error instanceof Error ? error.message : 'Deployment failed' });
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'address' | 'tx') => {
    await navigator.clipboard.writeText(text);
    if (type === 'address') {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deploy Contract</DialogTitle>
          <DialogDescription>
            Deploy your compiled contract to <strong>{chainDisplayName}</strong>
          </DialogDescription>
        </DialogHeader>

        {!deployResult ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rpc-select">RPC Endpoint</Label>
              <Select value={selectedRpc} onValueChange={setSelectedRpc} disabled={availableRpcs.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={availableRpcs.length ? 'Select RPC endpoint' : 'No RPCs available'} />
                </SelectTrigger>
                <SelectContent>
                  {availableRpcs.map((rpc) => (
                    <SelectItem key={rpc.url} value={rpc.url}>
                      {rpc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground">
                Tip: If deployment fails, switch RPC and retry (some public RPCs can rate-limit writes).
              </p>
            </div>

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
            </div>

            <Button
              onClick={handleDeploy}
              disabled={isDeploying || !privateKey || !selectedRpc || !sessionId}
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
              <p className="text-sm text-destructive font-medium mb-2">Deployment Failed</p>
              <p className="text-xs text-destructive/80 whitespace-pre-wrap wrap-break-words">
                {deployResult.error}
              </p>
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
                    <Button size="sm" variant="ghost" asChild>
                      <a href={getExplorerUrl(deployResult.contractAddress)} target="_blank" rel="noopener noreferrer">
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
                      <a href={getTxExplorerUrl(deployResult.txHash)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={() => handleOpenChange(false)} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
