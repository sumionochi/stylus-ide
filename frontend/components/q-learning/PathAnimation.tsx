//pathanimation.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePublicClient } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { parseAbi } from 'viem';
import { Play, Pause, RotateCcw, Loader2 } from 'lucide-react';

const QLEARNING_ABI = parseAbi([
  'function getPolicy(uint256 row, uint256 col) external view returns (uint256)',
]);

const MAZE: number[][] = [
  [0, 0, 0, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 0, 0, 0],
];

interface PathStep {
  row: number;
  col: number;
  action: number;
}

interface PathAnimationProps {
  contractAddress: string;
  size: number;
  startPos: [number, number];
  goalPos: [number, number];
  isConnected: boolean;
  isTrained: boolean;
}

export function PathAnimation({
  contractAddress,
  size,
  startPos,
  goalPos,
  isConnected,
  isTrained,
}: PathAnimationProps) {
  const [path, setPath] = useState<PathStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [totalReward, setTotalReward] = useState(0);
  const [endedWithGoal, setEndedWithGoal] = useState(false);
  const [endReason, setEndReason] = useState<string | null>(null);

  const publicClient = usePublicClient({ chainId: arbitrumSepolia.id });

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const isWall = (r: number, c: number) => {
    const rr = Math.max(0, Math.min(size - 1, r));
    const cc = Math.max(0, Math.min(size - 1, c));
    return MAZE[rr]?.[cc] === 1;
  };

  const executeAction = (row: number, col: number, action: number): [number, number] => {
    let nextRow = row;
    let nextCol = col;

    switch (action) {
      case 0: nextRow = Math.max(0, row - 1); break; // Up
      case 1: nextRow = Math.min(size - 1, row + 1); break; // Down
      case 2: nextCol = Math.max(0, col - 1); break; // Left
      case 3: nextCol = Math.min(size - 1, col + 1); break; // Right
      default: break;
    }

    return [nextRow, nextCol];
  };

  const getActionName = (action: number) => ['Up', 'Down', 'Left', 'Right'][action] || 'Unknown';
  const getActionSymbol = (action: number) => ['↑', '↓', '←', '→'][action] || '?';

  const fetchPolicyGrid = async () => {
    if (!publicClient) throw new Error('publicClient not ready');
    const addr = contractAddress.trim().toLowerCase();
    if (!addr) throw new Error('Missing contract address');

    const cells: { row: number; col: number }[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (MAZE[r]?.[c] !== 1) cells.push({ row: r, col: c });
      }
    }

    const contracts = cells.map(({ row, col }) => ({
      address: addr as `0x${string}`,
      abi: QLEARNING_ABI,
      functionName: 'getPolicy' as const,
      args: [BigInt(row), BigInt(col)] as const,
    }));

    const res = await publicClient.multicall({ contracts, allowFailure: true });

    const grid: number[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
    for (let i = 0; i < cells.length; i++) {
      const { row, col } = cells[i];
      const r: any = res[i];
      if (r?.status === 'success') grid[row][col] = Number(r.result);
    }

    return grid;
  };

  const simulatePath = async () => {
    if (!publicClient || !contractAddress) return;

    setIsLoading(true);
    setIsAnimating(false);
    setPath([]);
    setCurrentStep(0);
    setTotalReward(0);
    setEndedWithGoal(false);
    setEndReason(null);

    try {
      const policyGrid = await fetchPolicyGrid();

      const simulatedPath: PathStep[] = [];
      let row = startPos[0];
      let col = startPos[1];
      let reward = 0;

      let goalReached = false;
      let reason: string | null = null;

      const maxSteps = 50;

      // loop detection by revisiting same cell too many times
      const visits = new Map<string, number>();
      let consecutiveWallMoves = 0;

      for (let step = 0; step < maxSteps; step++) {
        const action = policyGrid[row]?.[col] ?? 0;
        simulatedPath.push({ row, col, action });

        const key = `${row},${col}`;
        visits.set(key, (visits.get(key) ?? 0) + 1);
        if ((visits.get(key) ?? 0) >= 8) {
          reason = 'Loop detected (revisiting the same cell repeatedly).';
          break;
        }

        const [candidateRow, candidateCol] = executeAction(row, col, action);

        // WALL: stay in place, -10 (matches your contract semantics)
        if (isWall(candidateRow, candidateCol)) {
          reward -= 10;
          consecutiveWallMoves++;
          if (consecutiveWallMoves >= 8) {
            reason = 'Agent kept choosing wall moves.';
            break;
          }
          // stay (row/col unchanged)
        } else {
          // NORMAL step (including boundary clamp where you might not move): -1
          reward -= 1;
          consecutiveWallMoves = 0;
          row = candidateRow;
          col = candidateCol;
        }

        // GOAL: +100 then end
        if (row === goalPos[0] && col === goalPos[1]) {
          reward += 100;
          goalReached = true;
          reason = null;
          break;
        }

        if (step % 6 === 0) await sleep(20);
      }

      if (!goalReached && !reason) reason = 'Stopped (max steps reached).';

      setPath(simulatedPath);
      setTotalReward(reward);
      setEndedWithGoal(goalReached);
      setEndReason(reason);
    } catch (err) {
      console.error('Failed to simulate path:', err);
      setEndReason('RPC error while generating policy/path.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => setIsAnimating((v) => !v);
  const handleReset = () => {
    setIsAnimating(false);
    setCurrentStep(0);
  };

  useEffect(() => {
    if (!isAnimating || currentStep >= path.length - 1) {
      if (currentStep >= path.length - 1 && path.length > 0) setIsAnimating(false);
      return;
    }
    const t = setTimeout(() => setCurrentStep((p) => p + 1), 500);
    return () => clearTimeout(t);
  }, [isAnimating, currentStep, path.length]);

  const isCurrentPosition = (row: number, col: number) => {
    if (path.length === 0 || currentStep >= path.length) return false;
    const cur = path[currentStep];
    return cur.row === row && cur.col === col;
  };

  const isVisitedPosition = (row: number, col: number) =>
    path.slice(0, currentStep).some((s) => s.row === row && s.col === col);

  if (!isTrained) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Path Simulation</CardTitle>
          <CardDescription>Visualize the agent following the learned policy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p>Train the agent first to simulate the path</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Path Simulation</CardTitle>
        <CardDescription>Watch the agent navigate from start to goal using learned policy</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button onClick={simulatePath} disabled={isLoading || isAnimating || !isConnected} size="sm">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading Path...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Generate Path
              </>
            )}
          </Button>

          {path.length > 0 && (
            <>
              <Button onClick={handlePlayPause} disabled={isLoading} size="sm" variant="outline">
                {isAnimating ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </>
                )}
              </Button>

              <Button onClick={handleReset} disabled={isLoading || isAnimating} size="sm" variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </>
          )}
        </div>

        {path.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted p-3 rounded-md">
              <div className="text-xs text-muted-foreground">Steps</div>
              <div className="text-xl font-bold">
                {Math.min(currentStep + 1, path.length)} / {path.length}
              </div>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <div className="text-xs text-muted-foreground">Total Reward</div>
              <div className="text-xl font-bold">{totalReward}</div>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <div className="text-xs text-muted-foreground">Current Action</div>
              <div className="text-xl font-bold">
                {currentStep < path.length ? getActionName(path[currentStep].action) : 'Done'}
              </div>
            </div>
          </div>
        )}

        {path.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Agent Position</h4>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
              {Array.from({ length: size }).map((_, row) =>
                Array.from({ length: size }).map((_, col) => {
                  const isCurrent = isCurrentPosition(row, col);
                  const isVisited = isVisitedPosition(row, col);
                  const isStart = row === startPos[0] && col === startPos[1];
                  const isGoal = row === goalPos[0] && col === goalPos[1];
                  const wall = isWall(row, col);

                  return (
                    <div
                      key={`${row}-${col}`}
                      className={`
                        w-12 h-12 rounded-md flex items-center justify-center
                        border transition-all
                        ${wall ? 'bg-slate-600/40 border-slate-600' : ''}
                        ${isCurrent ? 'bg-blue-500 border-blue-600 scale-110' : ''}
                        ${isVisited && !isCurrent ? 'bg-blue-500/30 border-blue-500/50' : ''}
                        ${!wall && !isCurrent && !isVisited && !isStart && !isGoal ? 'bg-muted border-border' : ''}
                        ${isStart && !isCurrent ? 'bg-green-500/50 border-green-500' : ''}
                        ${isGoal ? 'bg-red-500/50 border-red-500' : ''}
                      `}
                    >
                      {isCurrent && <span className="text-2xl">🤖</span>}
                      {isStart && !isCurrent && <span className="text-xs font-semibold text-white">S</span>}
                      {isGoal && !isCurrent && <span className="text-xs font-semibold text-white">G</span>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {path.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Path Sequence</h4>
            <div className="bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {path.map((step, idx) => (
                  <div
                    key={idx}
                    className={`
                      px-2 py-1 rounded text-xs font-mono
                      ${idx === currentStep ? 'bg-blue-500 text-white' : 'bg-background'}
                      ${idx < currentStep ? 'opacity-50' : ''}
                    `}
                  >
                    ({step.row},{step.col}) {getActionSymbol(step.action)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {path.length > 0 && currentStep >= path.length - 1 && !isAnimating && (
          endedWithGoal ? (
            <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-md text-sm text-green-400">
              <p className="font-medium">🎉 Goal Reached!</p>
              <p className="text-xs mt-1">
                Agent reached the goal in {path.length} steps with total reward: {totalReward}
              </p>
            </div>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-md text-sm text-yellow-300">
              <p className="font-medium">Stopped (did not reach goal)</p>
              <p className="text-xs mt-1">{endReason ?? 'Unknown reason'}</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
