'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePublicClient } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { parseAbi } from 'viem';
import { Loader2, RefreshCw } from 'lucide-react';

const QLEARNING_ABI = parseAbi([
  'function getQValue(uint256 row, uint256 col, uint256 action) external view returns (int256)',
]);

const ACTIONS = ['Up ↑', 'Down ↓', 'Left ←', 'Right →'];
const ACTION_SYMBOLS = ['↑', '↓', '←', '→'];

interface QTableHeatmapProps {
  contractAddress: string;
  size: number;
  isConnected: boolean;
  isTrained: boolean;
}

export function QTableHeatmap({ contractAddress, size, isConnected, isTrained }: QTableHeatmapProps) {
  const [qValues, setQValues] = useState<number[][][]>([]); // [row][col][action]
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const publicClient = usePublicClient({ chainId: arbitrumSepolia.id });

  useEffect(() => {
    if (isTrained && isConnected) {
      loadQTable();
    }
  }, [isTrained, isConnected]);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const loadQTable = async () => {
    if (!publicClient) return;

    setIsLoading(true);

    try {
      const qTable: number[][][] = [];

      for (let row = 0; row < size; row++) {
        const rowData: number[][] = [];
        for (let col = 0; col < size; col++) {
          const cellData: number[] = [];
          for (let action = 0; action < 4; action++) {
            try {
              const qValue = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: QLEARNING_ABI,
                functionName: 'getQValue',
                args: [BigInt(row), BigInt(col), BigInt(action)],
              });
              
              // Convert from scaled integer (divide by 10000)
              const scaledValue = Number(qValue) / 10000;
              cellData.push(scaledValue);

              // Delay every 10 calls to avoid rate limiting
              if ((row * size * 4 + col * 4 + action) % 10 === 0) {
                await sleep(50);
              }
            } catch (err) {
              console.error(`Failed to get Q-value for (${row}, ${col}, ${action}):`, err);
              cellData.push(0);
            }
          }
          rowData.push(cellData);
        }
        qTable.push(rowData);
      }

      setQValues(qTable);
    } catch (err) {
      console.error('Failed to load Q-table:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getColorForQValue = (qValue: number, maxQ: number, minQ: number): string => {
    if (maxQ === minQ) return 'bg-muted';
    
    const normalized = (qValue - minQ) / (maxQ - minQ);
    
    if (normalized > 0.8) return 'bg-green-500';
    if (normalized > 0.6) return 'bg-green-400';
    if (normalized > 0.4) return 'bg-yellow-500';
    if (normalized > 0.2) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const getBestAction = (row: number, col: number): number => {
    if (!qValues[row]?.[col]) return 0;
    
    const actions = qValues[row][col];
    let bestAction = 0;
    let maxQ = actions[0];
    
    for (let i = 1; i < actions.length; i++) {
      if (actions[i] > maxQ) {
        maxQ = actions[i];
        bestAction = i;
      }
    }
    
    return bestAction;
  };

  // Find global min/max for color scaling
  const getGlobalMinMax = () => {
    let min = 0;
    let max = 0;
    
    qValues.forEach(row => {
      row.forEach(cell => {
        cell.forEach(q => {
          min = Math.min(min, q);
          max = Math.max(max, q);
        });
      });
    });
    
    return { min, max };
  };

  const { min: globalMin, max: globalMax } = qValues.length > 0 ? getGlobalMinMax() : { min: 0, max: 0 };

  if (!isTrained) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Q-Table Heatmap</CardTitle>
          <CardDescription>
            Visualize learned Q-values after training
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p>Train the agent first to see Q-values</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Q-Table Heatmap</CardTitle>
            <CardDescription>
              Click a cell to see Q-values for all actions
            </CardDescription>
          </div>
          <Button
            onClick={loadQTable}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && qValues.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading Q-values...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take 10-20 seconds</p>
            </div>
          </div>
        ) : qValues.length > 0 ? (
          <>
            {/* Q-Table Grid */}
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
              {qValues.map((row, rowIdx) =>
                row.map((cell, colIdx) => {
                  const bestAction = getBestAction(rowIdx, colIdx);
                  const maxQValue = Math.max(...cell);
                  const isSelected = selectedCell?.[0] === rowIdx && selectedCell?.[1] === colIdx;
                  
                  return (
                    <button
                      key={`${rowIdx}-${colIdx}`}
                      onClick={() => setSelectedCell([rowIdx, colIdx])}
                      className={`
                        w-16 h-16 rounded-md flex flex-col items-center justify-center
                        border-2 transition-all hover:scale-105
                        ${isSelected ? 'border-primary' : 'border-border'}
                        ${getColorForQValue(maxQValue, globalMax, globalMin)}
                        relative
                      `}
                    >
                      <span className="text-xs text-white/70 absolute top-1 left-1">
                        {rowIdx},{colIdx}
                      </span>
                      <span className="text-2xl font-bold text-white">
                        {ACTION_SYMBOLS[bestAction]}
                      </span>
                      <span className="text-xs text-white/90 mt-1">
                        {maxQValue.toFixed(0)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">Q-Value Range:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-400 rounded" />
                <span>Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded" />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span>High</span>
              </div>
              <span className="ml-auto text-muted-foreground">
                Range: {globalMin.toFixed(0)} to {globalMax.toFixed(0)}
              </span>
            </div>

            {/* Selected Cell Details */}
            {selectedCell && qValues[selectedCell[0]]?.[selectedCell[1]] && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-3">
                  State ({selectedCell[0]}, {selectedCell[1]}) - Q-Values
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {ACTIONS.map((action, idx) => {
                    const qValue = qValues[selectedCell[0]][selectedCell[1]][idx];
                    const isBest = idx === getBestAction(selectedCell[0], selectedCell[1]);
                    
                    return (
                      <div
                        key={idx}
                        className={`
                          p-2 rounded-md border
                          ${isBest ? 'border-primary bg-primary/10' : 'border-border'}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{action}</span>
                          {isBest && (
                            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                              Best
                            </span>
                          )}
                        </div>
                        <div className="text-lg font-bold mt-1">
                          {qValue.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Best action: <strong>{ACTIONS[getBestAction(selectedCell[0], selectedCell[1])]}</strong>
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p>Click "Refresh" to load Q-values</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}