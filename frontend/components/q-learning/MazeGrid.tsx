//mazegrid.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { parseAbi } from 'viem';
import { Loader2, RefreshCw } from 'lucide-react';

const QLEARNING_ABI = parseAbi([
  'function getPolicy(uint256 row, uint256 col) external view returns (uint256)',
  'function isTrained() external view returns (bool)',
]);

const HARDCODED_MAZE = [
  [0, 0, 0, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 0, 0],
];

interface MazeGridProps {
  size: number;
  startPos: [number, number];
  goalPos: [number, number];
  contractAddress: string;
  isConnected: boolean;
  refreshNonce?: number; // increments when you want a forced refresh
}

type CacheEntry = {
  trained: boolean;
  policy: number[][];
  inFlight?: Promise<{ trained: boolean; policy: number[][] }>;
  updatedAt: number;
};

const POLICY_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 1 min: adjust if you want

export function MazeGrid({
  size,
  startPos,
  goalPos,
  contractAddress,
  isConnected,
  refreshNonce = 0,
}: MazeGridProps) {
  const [policy, setPolicy] = useState<number[][]>([]);
  const [isTrained, setIsTrained] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient({ chainId: arbitrumSepolia.id });

  const normalizedAddress = useMemo(
    () => contractAddress.trim().toLowerCase(),
    [contractAddress]
  );

  const cacheKey = useMemo(
    () => `${arbitrumSepolia.id}:${normalizedAddress}`,
    [normalizedAddress]
  );

  const runIdRef = useRef(0);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const retryCall = async <T,>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delayMs = 700
  ): Promise<T> => {
    let lastError: Error | null = null;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (i < maxRetries - 1) await sleep(delayMs * (i + 1));
      }
    }
    throw lastError!;
  };

  const loadMazeData = useCallback(
    async (forceReload: boolean) => {
      if (!publicClient) return;
      if (!isConnected) return;
      if (!normalizedAddress) return;

      const myRun = ++runIdRef.current;
      const isCurrent = () => runIdRef.current === myRun;
      const safe = (fn: () => void) => {
        if (!isCurrent()) return;
        fn();
      };

      const cached = POLICY_CACHE.get(cacheKey);
      const cacheFresh =
        cached &&
        cached.policy?.length > 0 &&
        Date.now() - cached.updatedAt < CACHE_TTL_MS;

      // Use fresh cache immediately (no loading state, no flicker)
      if (!forceReload && cacheFresh) {
        safe(() => {
          setIsTrained(cached!.trained);
          setPolicy(cached!.policy);
          setError(null);
          setIsLoading(false);
          setLoadingProgress('');
        });
        return;
      }

      // If there’s an in-flight request and we aren't forcing, dedupe onto it
      if (!forceReload && cached?.inFlight) {
        safe(() => {
          setIsLoading(true);
          setLoadingProgress('Loading policy (deduped)...');
          setError(null);
        });

        try {
          const res = await cached.inFlight;
          safe(() => {
            setIsTrained(res.trained);
            setPolicy(res.policy);
            setError(null);
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          safe(() => setError(`Failed to load policy: ${msg.slice(0, 140)}`));
        } finally {
          safe(() => {
            setIsLoading(false);
            setLoadingProgress('');
          });
        }
        return;
      }

      if (forceReload) POLICY_CACHE.delete(cacheKey);

      // IMPORTANT: keep previous policy visible while loading (no arrow flicker)
      safe(() => {
        setIsLoading(true);
        setLoadingProgress('Checking training status...');
        setError(null);
      });

      const inFlight = (async () => {
        const trained = await retryCall(async () => {
          return await publicClient.readContract({
            address: normalizedAddress as `0x${string}`,
            abi: QLEARNING_ABI,
            functionName: 'isTrained',
          });
        });

        if (!trained) return { trained: false, policy: [] as number[][] };

        safe(() => setLoadingProgress('Loading policy (multicall)...'));

        const cellsToFetch: { row: number; col: number }[] = [];
        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            if (HARDCODED_MAZE[row]?.[col] !== 1) cellsToFetch.push({ row, col });
          }
        }

        const contracts = cellsToFetch.map(({ row, col }) => ({
          address: normalizedAddress as `0x${string}`,
          abi: QLEARNING_ABI,
          functionName: 'getPolicy' as const,
          args: [BigInt(row), BigInt(col)] as const,
        }));

        const results = await retryCall(async () => {
          return await publicClient.multicall({
            contracts,
            allowFailure: true,
          });
        }, 3, 900);

        const policyData: number[][] = Array.from({ length: size }, () =>
          Array.from({ length: size }, () => 0)
        );

        for (let i = 0; i < cellsToFetch.length; i++) {
          const { row, col } = cellsToFetch[i];
          const r: any = results[i];
          if (r?.status === 'success') policyData[row][col] = Number(r.result);
        }

        return { trained: true, policy: policyData };
      })();

      POLICY_CACHE.set(cacheKey, {
        trained: cached?.trained ?? false,
        policy: cached?.policy ?? [],
        inFlight,
        updatedAt: Date.now(),
      });

      try {
        const res = await inFlight;
        POLICY_CACHE.set(cacheKey, {
          trained: res.trained,
          policy: res.policy,
          updatedAt: Date.now(),
        });

        safe(() => {
          setIsTrained(res.trained);
          setPolicy(res.policy);
          setError(null);
        });
      } catch (err) {
        POLICY_CACHE.delete(cacheKey);

        const msg = err instanceof Error ? err.message : String(err);
        safe(() => {
          if (msg.toLowerCase().includes('rate') || msg.includes('Failed to fetch')) {
            setError('RPC rate limited. Wait a moment and click “Refresh Policy”.');
          } else {
            setError(`Failed to load policy: ${msg.slice(0, 140)}`);
          }
        });
      } finally {
        safe(() => {
          setIsLoading(false);
          setLoadingProgress('');
        });
      }
    },
    [publicClient, isConnected, normalizedAddress, cacheKey, size]
  );

  // Initial load + reload when publicClient becomes ready
  useEffect(() => {
    if (!isConnected || !normalizedAddress) return;
    loadMazeData(false);

    return () => {
      // invalidate any pending async completions
      runIdRef.current += 1;
    };
  }, [isConnected, normalizedAddress, publicClient, loadMazeData]);

  // Forced refresh without unmounting
  useEffect(() => {
    if (!isConnected || !normalizedAddress) return;
    if (refreshNonce === 0) return;
    loadMazeData(true);
  }, [refreshNonce, isConnected, normalizedAddress, loadMazeData]);

  const handleRefresh = () => loadMazeData(true);

  const getActionArrow = (action: number) => ['↑', '↓', '←', '→'][action] ?? '?';

  const getCellColor = (row: number, col: number) => {
    if (row === startPos[0] && col === startPos[1]) return 'bg-green-500';
    if (row === goalPos[0] && col === goalPos[1]) return 'bg-red-500';
    if (HARDCODED_MAZE[row]?.[col] === 1) return 'bg-gray-700';
    return 'bg-muted';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingProgress || 'Loading...'}
        </div>
      )}

      {error && (
        <div className="w-full bg-red-500/10 border border-red-500/20 p-3 rounded-md">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="mt-2 flex items-center gap-1 text-xs text-red-300 hover:text-red-200 underline disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh Policy
          </button>
        </div>
      )}

      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {Array.from({ length: size }).map((_, row) =>
          Array.from({ length: size }).map((_, col) => (
            <div
              key={`${row}-${col}`}
              className={`
                w-16 h-16 rounded-md flex items-center justify-center
                ${getCellColor(row, col)}
                border border-border
                relative
              `}
            >
              <span className="absolute top-1 left-1 text-xs text-muted-foreground">
                {row},{col}
              </span>

              {isTrained &&
                HARDCODED_MAZE[row]?.[col] !== 1 &&
                !(row === goalPos[0] && col === goalPos[1]) &&
                policy[row]?.[col] !== undefined && (
                  <span className="text-2xl font-bold">{getActionArrow(policy[row][col])}</span>
              )}

              {row === startPos[0] && col === startPos[1] && (
                <span className="absolute bottom-1 text-xs font-semibold text-white">START</span>
              )}
              {row === goalPos[0] && col === goalPos[1] && (
                <span className="absolute bottom-1 text-xs font-semibold text-white">GOAL</span>
              )}
            </div>
          ))
        )}
      </div>

      {!isTrained && !isLoading && (
        <p className="text-sm text-muted-foreground">Train the agent to see the learned policy arrows</p>
      )}

      {isTrained && !error && (
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-1 text-sm text-primary hover:underline disabled:opacity-50"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh Policy
        </button>
      )}
    </div>
  );
}
