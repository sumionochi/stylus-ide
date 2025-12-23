//mazegrid.tsx  (your qlearning/page.tsx)
'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { MazeGrid } from '@/components/q-learning/MazeGrid';
import { ContractConfig } from '@/components/q-learning/ContractConfig';
import { TrainingForm } from '@/components/q-learning/TrainingForm';
import { QTableHeatmap } from '@/components/q-learning/QTableHeatmap';
import { PathAnimation } from '@/components/q-learning/PathAnimation';

export default function QLearningDemoPage() {
  // Input field state (can change freely without restarting reads)
  const [contractAddress, setContractAddress] = useState<string>('');

  // ✅ Stable, “connected” address used for reads
  const [connectedContractAddress, setConnectedContractAddress] = useState<string>('');

  const [isConnected, setIsConnected] = useState(false);
  const [isTrained, setIsTrained] = useState(false);

  const [mazeConfig, setMazeConfig] = useState<{
    size: number;
    startRow: number;
    startCol: number;
    goalRow: number;
    goalCol: number;
  } | null>(null);

  // Use refreshNonce instead of key-remount
  const [refreshKey, setRefreshKey] = useState(0);

  // ✅ Guard: prevents multiple refresh triggers if TrainingForm calls callback more than once
  const trainingCompleteLockRef = useRef(false);

  const handleTrainingComplete = () => {
    if (trainingCompleteLockRef.current) return;
    trainingCompleteLockRef.current = true;

    setRefreshKey((prev) => prev + 1);
    setIsTrained(true);

    // unlock after a short window (covers receipt/status double-calls)
    setTimeout(() => {
      trainingCompleteLockRef.current = false;
    }, 1500);
  };

  const activeAddress = connectedContractAddress || '';

  return (
    <main className="min-h-screen bg-background">

      <div className="container mx-auto p-6 max-w-7xl">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Q-Learning Maze Agent</h1>
          </div>
          <p className="text-muted-foreground">Reinforcement learning agent that learns to navigate a maze on-chain</p>
          <p className="text-sm text-muted-foreground mt-2">
            Based on <strong>Watkins (1989)</strong> - "Learning from Delayed Rewards"
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Contract Config + Training */}
          <div className="lg:col-span-1 space-y-6">
            <ContractConfig
              contractAddress={contractAddress}
              setContractAddress={setContractAddress}
              isConnected={isConnected}
              setIsConnected={setIsConnected}
              setConnectedContractAddress={setConnectedContractAddress}
              setMazeConfig={setMazeConfig}
              setIsTrained={setIsTrained}
            />

            {isConnected && activeAddress && (
              <TrainingForm
                contractAddress={activeAddress}
                isConnected={isConnected}
                onTrainingComplete={handleTrainingComplete}
              />
            )}
          </div>

          {/* Center/Right: Visualizations */}
          <div className="lg:col-span-2 space-y-6">
            {/* Maze Grid */}
            <Card>
              <CardHeader>
                <CardTitle>Maze Environment</CardTitle>
                <CardDescription>5×5 grid with walls (gray), start (green), and goal (red)</CardDescription>
              </CardHeader>
              <CardContent>
                {mazeConfig && activeAddress ? (
                  <MazeGrid
                    // ✅ do NOT key-remount
                    refreshNonce={refreshKey}
                    size={mazeConfig.size}
                    startPos={[mazeConfig.startRow, mazeConfig.startCol]}
                    goalPos={[mazeConfig.goalRow, mazeConfig.goalCol]}
                    contractAddress={activeAddress}
                    isConnected={isConnected}
                  />
                ) : (
                  <div className="flex items-center justify-center h-96 text-muted-foreground">
                    <div className="text-center">
                      <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Connect to a deployed Q-Learning contract to view the maze</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Path Animation */}
            {mazeConfig && activeAddress && (
              <PathAnimation
                contractAddress={activeAddress}
                size={mazeConfig.size}
                startPos={[mazeConfig.startRow, mazeConfig.startCol]}
                goalPos={[mazeConfig.goalRow, mazeConfig.goalCol]}
                isConnected={isConnected}
                isTrained={isTrained}
              />
            )}

            {/* Q-Table Heatmap */}
            {mazeConfig && activeAddress && (
              <QTableHeatmap
                contractAddress={activeAddress}
                size={mazeConfig.size}
                isConnected={isConnected}
                isTrained={isTrained}
              />
            )}
          </div>
        </div>

        {/* How It Works Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How Q-Learning Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Bellman Optimality Equation</h4>
                <div className="bg-muted p-3 rounded-md font-mono text-xs">
                  Q*(s,a) = R(s,a) + γ·max<sub>a'</sub> Q*(s',a')
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  The optimal Q-value is the immediate reward plus the discounted maximum future reward.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Q-Learning Update Rule</h4>
                <div className="bg-muted p-3 rounded-md font-mono text-xs">
                  Q(s,a) ← Q(s,a) + α[r + γ·max<sub>a'</sub> Q(s',a') - Q(s,a)]
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Update Q-values by learning from the temporal difference error.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="font-semibold mb-2">Parameters</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• <strong>α (alpha)</strong>: Learning rate - how much to update Q-values (0.0 - 1.0)</li>
                <li>• <strong>γ (gamma)</strong>: Discount factor - importance of future rewards (0.0 - 1.0)</li>
                <li>• <strong>ε (epsilon)</strong>: Exploration rate - probability of random actions (0.0 - 1.0)</li>
                <li>• <strong>Episodes</strong>: Number of complete runs from start to goal</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
