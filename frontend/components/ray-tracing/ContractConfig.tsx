'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { usePublicClient } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { MNN_ABI, RAY_TRACING_ABI } from '@/lib/ray-tracing-abi';

interface ContractConfigProps {
  mnnAddress: string;
  setMnnAddress: (address: string) => void;
  nftAddress: string;
  setNftAddress: (address: string) => void;
  isMnnConnected: boolean;
  setIsMnnConnected: (connected: boolean) => void;
  isNftConnected: boolean;
  setIsNftConnected: (connected: boolean) => void;
}

export function ContractConfig({
  mnnAddress,
  setMnnAddress,
  nftAddress,
  setNftAddress,
  isMnnConnected,
  setIsMnnConnected,
  isNftConnected,
  setIsNftConnected,
}: ContractConfigProps) {
  const [isLoadingMnn, setIsLoadingMnn] = useState(false);
  const [isLoadingNft, setIsLoadingNft] = useState(false);
  const [mnnInfo, setMnnInfo] = useState<{ inputs: number; hidden: number; outputs: number } | null>(null);
  const [nftInfo, setNftInfo] = useState<{ totalSupply: number; width: number; height: number } | null>(null);
  const publicClient = usePublicClient({ chainId: arbitrumSepolia.id });

  const handleConnectMnn = async () => {
    if (!mnnAddress || !publicClient) {
      alert('Please enter MNN contract address');
      return;
    }

    setIsLoadingMnn(true);

    try {
      const result = await publicClient.readContract({
        address: mnnAddress as `0x${string}`,
        abi: MNN_ABI as any,
        functionName: 'getNetworkInfo',
        args: [], // Added empty args
      });

      const [inputs, hidden, outputs] = result as [bigint, bigint, bigint];

      setMnnInfo({
        inputs: Number(inputs),
        hidden: Number(hidden),
        outputs: Number(outputs),
      });

      setIsMnnConnected(true);
    } catch (error) {
      console.error('MNN connection failed:', error);
      alert('Failed to connect to MNN contract. Please check the address.');
      setIsMnnConnected(false);
    } finally {
      setIsLoadingMnn(false);
    }
  };

  const handleConnectNft = async () => {
    if (!nftAddress || !publicClient) {
      alert('Please enter NFT contract address');
      return;
    }

    setIsLoadingNft(true);

    try {
      const totalSupply = await publicClient.readContract({
        address: nftAddress as `0x${string}`,
        abi: RAY_TRACING_ABI as any,
        functionName: 'totalSupply',
        args: [], // Added empty args
      });

      const resolution = await publicClient.readContract({
        address: nftAddress as `0x${string}`,
        abi: RAY_TRACING_ABI as any,
        functionName: 'getResolution',
        args: [], // Added empty args
      });

      const [width, height] = resolution as [bigint, bigint];

      setNftInfo({
        totalSupply: Number(totalSupply as bigint),
        width: Number(width),
        height: Number(height),
      });

      setIsNftConnected(true);
    } catch (error) {
      console.error('NFT connection failed:', error);
      alert('Failed to connect to NFT contract. Please check the address.');
      setIsNftConnected(false);
    } finally {
      setIsLoadingNft(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Configuration</CardTitle>
        <CardDescription>
          Connect to deployed MNN and Ray Tracing contracts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* MNN Contract */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Mini Neural Network (MNN)</h4>
          <div className="space-y-2">
            <Label htmlFor="mnn-address">Contract Address</Label>
            <Input
              id="mnn-address"
              placeholder="0x..."
              value={mnnAddress}
              onChange={(e) => setMnnAddress(e.target.value)}
              disabled={isLoadingMnn}
            />
          </div>

          <Button
            onClick={handleConnectMnn}
            disabled={isLoadingMnn || !mnnAddress}
            className="w-full"
            size="sm"
          >
            {isLoadingMnn ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                {isMnnConnected ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {isMnnConnected ? 'Connected' : 'Connect MNN'}
              </>
            )}
          </Button>

          {isMnnConnected && mnnInfo && (
            <div className="bg-muted p-3 rounded-md text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Architecture:</span>
                <span className="font-mono">{mnnInfo.inputs}→{mnnInfo.hidden}→{mnnInfo.outputs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-green-500">✓ Ready</span>
              </div>
            </div>
          )}
        </div>

        {/* NFT Contract */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Ray Tracing NFT</h4>
          <div className="space-y-2">
            <Label htmlFor="nft-address">Contract Address</Label>
            <Input
              id="nft-address"
              placeholder="0x..."
              value={nftAddress}
              onChange={(e) => setNftAddress(e.target.value)}
              disabled={isLoadingNft}
            />
          </div>

          <Button
            onClick={handleConnectNft}
            disabled={isLoadingNft || !nftAddress}
            className="w-full"
            size="sm"
          >
            {isLoadingNft ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                {isNftConnected ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {isNftConnected ? 'Connected' : 'Connect NFT'}
              </>
            )}
          </Button>

          {isNftConnected && nftInfo && (
            <div className="bg-muted p-3 rounded-md text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolution:</span>
                <span className="font-mono">{nftInfo.width}×{nftInfo.height}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Minted:</span>
                <span>{nftInfo.totalSupply}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="text-green-500">✓ Ready</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Start Guide */}
        {!isMnnConnected && !isNftConnected && (
          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-md text-sm text-blue-400">
            <p className="font-medium mb-1">Quick Start:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Load templates in IDE (MNN + Ray Tracing)</li>
              <li>Compile both contracts</li>
              <li>Deploy to Arbitrum Sepolia</li>
              <li>Paste addresses here</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}