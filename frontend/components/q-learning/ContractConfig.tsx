//contractconfig.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { usePublicClient } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { parseAbi } from 'viem';

const QLEARNING_ABI = parseAbi([
  'function getMazeConfig() external view returns (uint256, uint256, uint256, uint256, uint256, uint256)',
  'function getTrainingInfo() external view returns (bool, uint256)',
]);

interface ContractConfigProps {
  // Input field value
  contractAddress: string;
  setContractAddress: (address: string) => void;

  // Connected status (UI)
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;

  // ✅ NEW: connected address used by readers (stable, only changes when Connect succeeds)
  setConnectedContractAddress: (address: string) => void;

  // Maze + trained status pushed to parent
  setMazeConfig: (config: any) => void;
  setIsTrained: (trained: boolean) => void;
}

export function ContractConfig({
  contractAddress,
  setContractAddress,
  isConnected,
  setIsConnected,
  setConnectedContractAddress,
  setMazeConfig,
  setIsTrained,
}: ContractConfigProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [trainingInfo, setTrainingInfo] = useState<{ trained: boolean; episodes: number } | null>(null);
  const publicClient = usePublicClient({ chainId: arbitrumSepolia.id });

  const handleConnect = async () => {
    const addr = contractAddress.trim();

    if (!addr || !publicClient) {
      alert('Please enter a contract address');
      return;
    }

    setIsLoading(true);

    try {
      // Load maze configuration
      const config = await publicClient.readContract({
        address: addr as `0x${string}`,
        abi: QLEARNING_ABI,
        functionName: 'getMazeConfig',
      });

      setMazeConfig({
        size: Number(config[0]),
        numActions: Number(config[1]),
        startRow: Number(config[2]),
        startCol: Number(config[3]),
        goalRow: Number(config[4]),
        goalCol: Number(config[5]),
      });

      // Load training info
      const training = await publicClient.readContract({
        address: addr as `0x${string}`,
        abi: QLEARNING_ABI,
        functionName: 'getTrainingInfo',
      });

      const trained = Boolean(training[0]);
      const episodes = Number(training[1]);

      setTrainingInfo({ trained, episodes });

      // ✅ Push trained status to parent so other widgets don’t flicker/mismatch
      setIsTrained(trained);

      // ✅ IMPORTANT: “Connected address” is locked-in and used by MazeGrid/reads
      setConnectedContractAddress(addr);

      setIsConnected(true);
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect to contract. Please check the address.');
      setIsConnected(false);
      setConnectedContractAddress('');
      setIsTrained(false);
      setTrainingInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Configuration</CardTitle>
        <CardDescription>Connect to your deployed Q-Learning contract</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contract-address">Contract Address</Label>
          <Input
            id="contract-address"
            placeholder="0x..."
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">Deploy the Q-Learning template from the IDE first</p>
        </div>

        <Button onClick={handleConnect} disabled={isLoading || !contractAddress.trim()} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              {isConnected ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              {isConnected ? 'Connected' : 'Connect to Contract'}
            </>
          )}
        </Button>

        {isConnected && trainingInfo && (
          <div className="space-y-2 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold">Contract Status</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trained:</span>
                <span className={trainingInfo.trained ? 'text-green-500' : 'text-yellow-500'}>
                  {trainingInfo.trained ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Episodes:</span>
                <span>{trainingInfo.episodes}</span>
              </div>
            </div>
          </div>
        )}

        {!isConnected && (
          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-md text-sm text-blue-400">
            <p className="font-medium mb-1">Quick Start:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Load Q-Learning template in IDE</li>
              <li>Compile the contract</li>
              <li>Deploy to Arbitrum Sepolia</li>
              <li>Paste the contract address here</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
