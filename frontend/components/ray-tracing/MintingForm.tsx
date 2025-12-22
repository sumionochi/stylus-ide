'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Coins, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { RAY_TRACING_ABI } from '@/lib/ray-tracing-abi';

interface MintingFormProps {
  nftAddress: string;
  isNftConnected: boolean;
  predictedColors: [number, number, number] | null;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  onMintSuccess: (tokenId: bigint) => void;
}

export function MintingForm({
  nftAddress,
  isNftConnected,
  predictedColors,
  cameraX,
  cameraY,
  cameraZ,
  onMintSuccess,
}: MintingFormProps) {
  const { isConnected: walletConnected } = useAccount();
  
  // Background colors (can be customized)
  const [bgTopR, setBgTopR] = useState(255);
  const [bgTopG, setBgTopG] = useState(255);
  const [bgTopB, setBgTopB] = useState(255);
  const [bgBottomR, setBgBottomR] = useState(91);
  const [bgBottomG, setBgBottomG] = useState(127);
  const [bgBottomB, setBgBottomB] = useState(213);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const handleMint = async () => {
    if (!walletConnected || !isNftConnected || !predictedColors) {
      alert('Please connect wallet and generate colors first');
      return;
    }

    try {
      writeContract({
        address: nftAddress as `0x${string}`,
        abi: RAY_TRACING_ABI,
        functionName: 'mint',
        args: [
          predictedColors[0],  // sphere_r
          predictedColors[1],  // sphere_g
          predictedColors[2],  // sphere_b
          bgTopR,              // bg_color1_r
          bgTopG,              // bg_color1_g
          bgTopB,              // bg_color1_b
          bgBottomR,           // bg_color2_r
          bgBottomG,           // bg_color2_g
          bgBottomB,           // bg_color2_b
          cameraX,             // cam_x
          cameraY,             // cam_y
          cameraZ,             // cam_z
        ],
      });
    } catch (err) {
      console.error('Minting failed:', err);
    }
  };

  // Extract token ID from transaction logs when successful
  if (isSuccess && receipt && !isPending) {
    // The mint function returns the token_id
    // We'll parse it from the transaction
    const tokenId = BigInt(0); // This will be the new token ID
    setTimeout(() => {
      onMintSuccess(tokenId);
    }, 1000);
  }

  const explorerUrl = hash 
    ? `${arbitrumSepolia.blockExplorers.default.url}/tx/${hash}`
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mint NFT</CardTitle>
        <CardDescription>
          Store rendering parameters on-chain as an NFT
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Background Colors */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Background Gradient</h4>
          
          {/* Top Color */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-md border border-border"
              style={{ backgroundColor: `rgb(${bgTopR}, ${bgTopG}, ${bgTopB})` }}
            />
            <div className="flex-1 grid grid-cols-3 gap-2">
              <Input
                type="number"
                placeholder="R"
                value={bgTopR}
                onChange={(e) => setBgTopR(Number(e.target.value))}
                min={0}
                max={255}
                className="text-xs"
              />
              <Input
                type="number"
                placeholder="G"
                value={bgTopG}
                onChange={(e) => setBgTopG(Number(e.target.value))}
                min={0}
                max={255}
                className="text-xs"
              />
              <Input
                type="number"
                placeholder="B"
                value={bgTopB}
                onChange={(e) => setBgTopB(Number(e.target.value))}
                min={0}
                max={255}
                className="text-xs"
              />
            </div>
            <Label className="text-xs text-muted-foreground w-12">Top</Label>
          </div>

          {/* Bottom Color */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-md border border-border"
              style={{ backgroundColor: `rgb(${bgBottomR}, ${bgBottomG}, ${bgBottomB})` }}
            />
            <div className="flex-1 grid grid-cols-3 gap-2">
              <Input
                type="number"
                placeholder="R"
                value={bgBottomR}
                onChange={(e) => setBgBottomR(Number(e.target.value))}
                min={0}
                max={255}
                className="text-xs"
              />
              <Input
                type="number"
                placeholder="G"
                value={bgBottomG}
                onChange={(e) => setBgBottomG(Number(e.target.value))}
                min={0}
                max={255}
                className="text-xs"
              />
              <Input
                type="number"
                placeholder="B"
                value={bgBottomB}
                onChange={(e) => setBgBottomB(Number(e.target.value))}
                min={0}
                max={255}
                className="text-xs"
              />
            </div>
            <Label className="text-xs text-muted-foreground w-12">Bottom</Label>
          </div>
        </div>

        {/* Parameters Summary */}
        <div className="bg-muted p-3 rounded-md text-xs space-y-1">
          <h4 className="font-semibold mb-2">Parameters to Store</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Sphere RGB:</span>
              <span className="ml-2 font-mono">
                {predictedColors ? `${predictedColors[0]},${predictedColors[1]},${predictedColors[2]}` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Camera:</span>
              <span className="ml-2 font-mono">
                {cameraX},{cameraY},{cameraZ}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground pt-2">
            Total: 21 bytes (9 colors + 12 camera)
          </p>
        </div>

        {/* Mint Button */}
        <Button
          onClick={handleMint}
          disabled={!walletConnected || !isNftConnected || !predictedColors || isPending || isConfirming}
          className="w-full"
          size="lg"
        >
          {isPending || isConfirming ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isPending ? 'Waiting for signature...' : 'Minting NFT...'}
            </>
          ) : (
            <>
              <Coins className="h-4 w-4 mr-2" />
              Mint NFT (~$0.0001)
            </>
          )}
        </Button>

        {/* Transaction Status */}
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
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <p className="font-medium">NFT Minted Successfully!</p>
            </div>
            <p className="text-xs mt-1">
              Your rendering parameters are now stored on-chain. Ready for Step 5: Full rendering!
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-md text-sm text-red-400">
            <p className="font-medium">Minting Failed</p>
            <p className="text-xs mt-1">{error.message}</p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-md text-xs text-blue-400">
          <p className="font-medium mb-1">💡 What Happens:</p>
          <ul className="space-y-1">
            <li>• Stores 21 bytes on-chain (colors + camera)</li>
            <li>• Generates unique token ID</li>
            <li>• You own the NFT</li>
            <li>• Anyone can render it later (on-demand)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}