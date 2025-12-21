// trainingform.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Zap, ExternalLink, AlertTriangle } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseAbi } from 'viem';
import { arbitrumSepolia } from 'wagmi/chains';

const QLEARNING_ABI = parseAbi([
  'function train(uint256 episodes, uint256 max_steps, uint256 epsilon, uint256 alpha, uint256 gamma) external',
]);

interface TrainingFormProps {
  contractAddress: string;
  isConnected: boolean;
  onTrainingComplete: () => void;
}

function clampInt(value: string, min: number, max: number, fallback: number) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function TrainingForm({ contractAddress, isConnected, onTrainingComplete }: TrainingFormProps) {
  const { isConnected: walletConnected } = useAccount();

  // Defaults (scaled params are /10000 in your contract)
  const [episodes, setEpisodes] = useState('50'); // 10-100 recommended
  const [maxSteps, setMaxSteps] = useState('50'); // 20-100 recommended
  const [epsilon, setEpsilon] = useState('2000'); // 0.2
  const [alpha, setAlpha] = useState('2000'); // 0.2
  const [gamma, setGamma] = useState('9000'); // 0.9

  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
    // If your whole dApp is always on Arbitrum Sepolia, keep this.
    // If not, remove it.
    chainId: arbitrumSepolia.id,
  });

  // --- one-shot completion latch ---
  const notifiedHashRef = useRef<`0x${string}` | null>(null);
  const onCompleteRef = useRef(onTrainingComplete);

  useEffect(() => {
    onCompleteRef.current = onTrainingComplete;
  }, [onTrainingComplete]);

  const LATCH_KEY = useMemo(
    () => `qlearning:train:completed:${contractAddress.toLowerCase()}`,
    [contractAddress],
  );

  // Reset latch whenever user changes contract
  useEffect(() => {
    notifiedHashRef.current = null;
    try {
      sessionStorage.removeItem(LATCH_KEY);
    } catch {
      // ignore
    }
  }, [LATCH_KEY]);

  useEffect(() => {
    if (!isSuccess || !hash) return;

    // In-component latch
    if (notifiedHashRef.current === hash) return;

    // Session latch (survives StrictMode dev remounts)
    try {
      const prev = sessionStorage.getItem(LATCH_KEY);
      if (prev === hash) return;
      sessionStorage.setItem(LATCH_KEY, hash);
    } catch {
      // ignore (private mode, etc.)
    }

    notifiedHashRef.current = hash;

    const t = window.setTimeout(() => {
      onCompleteRef.current();
    }, 800);

    return () => window.clearTimeout(t);
  }, [isSuccess, hash, LATCH_KEY]);

  const gasEstimate = useMemo(() => {
    const eps = clampInt(episodes, 1, 1000, 50);
    const steps = clampInt(maxSteps, 1, 200, 50);
    const totalOps = eps * steps;

    // This is just a heuristic display. Don’t treat as exact.
    const estimatedGas = totalOps * 1000;
    const safe = estimatedGas <= 25_000_000; // ~25M heuristic safety

    return { operations: totalOps, estimatedGas, safe };
  }, [episodes, maxSteps]);

  const handleTrain = async () => {
    if (!walletConnected) {
      alert('Please connect your wallet first.');
      return;
    }
    if (!contractAddress) {
      alert('Please enter a contract address.');
      return;
    }

    // Clamp inputs to sane ranges before sending
    const eps = clampInt(episodes, 1, 1000, 50);
    const steps = clampInt(maxSteps, 1, 200, 50);
    const e = clampInt(epsilon, 0, 10000, 2000);
    const a = clampInt(alpha, 0, 10000, 2000);
    const g = clampInt(gamma, 0, 10000, 9000);

    if (!gasEstimate.safe) {
      const ok = window.confirm(
        `⚠️ High Gas Warning\n\n` +
          `Approx operations: ${gasEstimate.operations.toLocaleString()}\n` +
          `Heuristic gas: ${gasEstimate.estimatedGas.toLocaleString()}\n\n` +
          `This might fail due to gas limits.\n\nContinue anyway?`,
      );
      if (!ok) return;
    }

    // Reset latches for a new training tx
    notifiedHashRef.current = null;
    try {
      sessionStorage.removeItem(LATCH_KEY);
    } catch {
      // ignore
    }

    writeContract({
      address: contractAddress as `0x${string}`,
      abi: QLEARNING_ABI,
      functionName: 'train',
      args: [BigInt(eps), BigInt(steps), BigInt(e), BigInt(a), BigInt(g)],
      gas: BigInt(30_000_000),
    });
  };

  const explorerUrl = hash
    ? `${arbitrumSepolia.blockExplorers.default.url}/tx/${hash}`
    : null;

  const combinedError = writeError ?? receiptError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Train Agent</CardTitle>
        <CardDescription>
          Configure Q-learning parameters and train the agent on-chain
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!gasEstimate.safe && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-md text-sm text-yellow-400">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">⚠️ High Gas Warning</p>
                <p className="text-xs mt-1">
                  Heuristic estimate suggests this may exceed gas limits. Reduce episodes or max steps.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="episodes">
            Episodes <span className="ml-2 text-xs text-muted-foreground">(10–100)</span>
          </Label>
          <Input
            id="episodes"
            type="number"
            value={episodes}
            onChange={(e) => setEpisodes(e.target.value)}
            disabled={isPending || isConfirming}
            min="1"
            max="1000"
          />
          <p className="text-xs text-muted-foreground">Number of complete runs from start to goal</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxSteps">
            Max Steps per Episode <span className="ml-2 text-xs text-muted-foreground">(20–100)</span>
          </Label>
          <Input
            id="maxSteps"
            type="number"
            value={maxSteps}
            onChange={(e) => setMaxSteps(e.target.value)}
            disabled={isPending || isConfirming}
            min="1"
            max="200"
          />
          <p className="text-xs text-muted-foreground">Maximum moves before episode ends</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="epsilon">
            Epsilon (Exploration) — scaled <span className="ml-2 text-xs text-muted-foreground">(0–10000)</span>
          </Label>
          <Input
            id="epsilon"
            type="number"
            value={epsilon}
            onChange={(e) => setEpsilon(e.target.value)}
            disabled={isPending || isConfirming}
            min="0"
            max="10000"
          />
          <p className="text-xs text-muted-foreground">Random action chance (e.g., 2000 = 0.2)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="alpha">
            Alpha (Learning Rate) — scaled <span className="ml-2 text-xs text-muted-foreground">(0–10000)</span>
          </Label>
          <Input
            id="alpha"
            type="number"
            value={alpha}
            onChange={(e) => setAlpha(e.target.value)}
            disabled={isPending || isConfirming}
            min="0"
            max="10000"
          />
          <p className="text-xs text-muted-foreground">Update strength (e.g., 2000 = 0.2)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gamma">
            Gamma (Discount) — scaled <span className="ml-2 text-xs text-muted-foreground">(0–10000)</span>
          </Label>
          <Input
            id="gamma"
            type="number"
            value={gamma}
            onChange={(e) => setGamma(e.target.value)}
            disabled={isPending || isConfirming}
            min="0"
            max="10000"
          />
          <p className="text-xs text-muted-foreground">Future reward importance (e.g., 9000 = 0.9)</p>
        </div>

        <div className="bg-muted p-3 rounded-md text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Est. Operations:</span>
            <span className="font-mono">{gasEstimate.operations.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Heuristic Gas:</span>
            <span className="font-mono">{gasEstimate.estimatedGas.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Safety:</span>
            <span className={gasEstimate.safe ? 'text-green-500' : 'text-yellow-500'}>
              {gasEstimate.safe ? '✓ Likely OK' : '⚠ Risky'}
            </span>
          </div>
        </div>

        <Button
          onClick={handleTrain}
          disabled={!walletConnected || !isConnected || isPending || isConfirming}
          className="w-full"
          size="lg"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isPending ? 'Waiting for signature...' : 'Training on-chain...'}
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Train Agent
            </>
          )}
        </Button>

        {hash && (
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Transaction:</span>
              <a
                href={explorerUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                {hash.slice(0, 6)}...{hash.slice(-4)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span className={isSuccess ? 'text-green-500' : 'text-yellow-500'}>
                {isSuccess ? '✓ Success' : '⏳ Confirming...'}
              </span>
            </div>
          </div>
        )}

        {isSuccess && (
          <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-md text-sm text-green-400">
            <p className="font-medium">🎉 Training Complete!</p>
            <p className="text-xs mt-1">Refreshing the maze policy…</p>
          </div>
        )}

        {combinedError && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-md text-sm text-red-400">
            <p className="font-medium">Training Failed</p>
            <p className="text-xs mt-1">{combinedError.message}</p>
            {combinedError.message.toLowerCase().includes('gas') && (
              <p className="text-xs mt-2">💡 Try reducing episodes or max_steps</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
