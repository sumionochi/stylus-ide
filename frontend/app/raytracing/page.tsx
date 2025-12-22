'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { ContractConfig } from '@/components/ray-tracing/ContractConfig';
import { StyleControls } from '@/components/ray-tracing/StyleControls';
import { RenderCanvas } from '@/components/ray-tracing/RenderCanvas';
import { MintingForm } from '@/components/ray-tracing/MintingForm';
import { RenderingPanel } from '@/components/ray-tracing/RenderingPanel';

export default function RayTracingDemoPage() {
  // Contract state
  const [mnnAddress, setMnnAddress] = useState<string>('');
  const [nftAddress, setNftAddress] = useState<string>('');
  const [isMnnConnected, setIsMnnConnected] = useState(false);
  const [isNftConnected, setIsNftConnected] = useState(false);

  // Style parameters (0-100%)
  const [warmth, setWarmth] = useState(75);
  const [intensity, setIntensity] = useState(60);
  const [depth, setDepth] = useState(50);

  // Predicted colors from MNN
  const [predictedColors, setPredictedColors] = useState<[number, number, number] | null>(null);

  // Camera position
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);
  const [cameraZ, setCameraZ] = useState(0);

  // Minted token
  const [mintedTokenId, setMintedTokenId] = useState<bigint | null>(null);

  // Rendering state
  const [isRendering, setIsRendering] = useState(false);
  const [renderedPixels, setRenderedPixels] = useState<number[] | null>(null);

  const handleMintSuccess = (tokenId: bigint) => {
    setMintedTokenId(tokenId);
  };

  return (
    <main className="min-h-screen bg-background">

      <div className="container mx-auto p-6 max-w-7xl">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Ray Tracing NFT Engine</h1>
          </div>
          <p className="text-muted-foreground">
            On-chain 3D graphics with neural network aesthetic generation
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Dual smart contracts: <strong>Mini Neural Network</strong> (3→4→2) + <strong>Ray Tracing Engine</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Contract Config + Style Controls + Minting */}
          <div className="lg:col-span-1 space-y-6">
            <ContractConfig
              mnnAddress={mnnAddress}
              setMnnAddress={setMnnAddress}
              nftAddress={nftAddress}
              setNftAddress={setNftAddress}
              isMnnConnected={isMnnConnected}
              setIsMnnConnected={setIsMnnConnected}
              isNftConnected={isNftConnected}
              setIsNftConnected={setIsNftConnected}
            />

            {isMnnConnected && (
              <StyleControls
                warmth={warmth}
                setWarmth={setWarmth}
                intensity={intensity}
                setIntensity={setIntensity}
                depth={depth}
                setDepth={setDepth}
                mnnAddress={mnnAddress}
                predictedColors={predictedColors}
                setPredictedColors={setPredictedColors}
              />
            )}

            {isNftConnected && predictedColors && (
              <MintingForm
                nftAddress={nftAddress}
                isNftConnected={isNftConnected}
                predictedColors={predictedColors}
                cameraX={cameraX}
                cameraY={cameraY}
                cameraZ={cameraZ}
                onMintSuccess={handleMintSuccess}
              />
            )}
          </div>

          {/* Center/Right: Canvas + Rendering */}
          <div className="lg:col-span-2 space-y-6">
            <RenderCanvas
              predictedColors={predictedColors}
              cameraX={cameraX}
              setCameraX={setCameraX}
              cameraY={cameraY}
              setCameraY={setCameraY}
              cameraZ={cameraZ}
              setCameraZ={setCameraZ}
              isRendering={isRendering}
              renderedPixels={renderedPixels}
              nftAddress={nftAddress}
              isNftConnected={isNftConnected}
            />

            {/* On-Chain Rendering Panel */}

            {isNftConnected && (
                <RenderingPanel
                nftAddress={nftAddress}
                isNftConnected={isNftConnected}
                mintedTokenId={mintedTokenId}
                />
            )}

            {/* Token Info (shows after minting) */}
            {mintedTokenId !== null && (
              <Card>
                <CardHeader>
                  <CardTitle>Your NFT</CardTitle>
                  <CardDescription>
                    Successfully minted on-chain
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-md space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Token ID:</span>
                      <span className="font-mono">{mintedTokenId.toString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Contract:</span>
                      <span className="font-mono text-xs">{nftAddress.slice(0, 6)}...{nftAddress.slice(-4)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="text-green-500">✓ Minted</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Ready for Step 5: Full on-chain rendering!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Deployment Instructions */}
        {!isMnnConnected && !isNftConnected && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Deployment Guide</CardTitle>
              <CardDescription>
                Deploy contracts and start creating on-chain 3D art
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold">Step 1: Deploy Mini Neural Network</h4>
                <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground pl-4">
                  <li>Go back to IDE homepage</li>
                  <li>Load template: "Mini Neural Network (Aesthetic AI)"</li>
                  <li>Click "Compile" - should succeed</li>
                  <li>Connect wallet (Arbitrum Sepolia)</li>
                  <li>Click "Deploy" - pay gas (~$0.01)</li>
                  <li>Copy contract address from success message</li>
                  <li>Paste address in "MNN Contract" field above</li>
                </ol>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="font-semibold">Step 2: Deploy Ray Tracing NFT</h4>
                <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground pl-4">
                  <li>Load template: "Ray Tracing NFT Engine"</li>
                  <li>Click "Compile" - should succeed</li>
                  <li>Click "Deploy" - pay gas (~$0.02)</li>
                  <li>Copy contract address</li>
                  <li>Paste address in "NFT Contract" field above</li>
                </ol>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="font-semibold">Step 3: Generate & Mint</h4>
                <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground pl-4">
                  <li>Adjust style sliders (warmth, intensity, depth)</li>
                  <li>Click "Preview Colors (FREE)" - 0 gas cost!</li>
                  <li>See predicted colors from neural network</li>
                  <li>Adjust camera position and background colors</li>
                  <li>Click "Mint NFT" - stores parameters on-chain</li>
                  <li>Ready for Step 5: Full on-chain ray tracing!</li>
                </ol>
              </div>

              <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-md text-xs text-green-400 mt-4">
                <p className="font-medium mb-1">💰 Cost Breakdown:</p>
                <ul className="space-y-1">
                  <li>• MNN Deploy: ~$0.01 (one-time)</li>
                  <li>• NFT Deploy: ~$0.02 (one-time)</li>
                  <li>• Preview Colors: FREE (view function)</li>
                  <li>• Mint NFT: ~$0.0001 (per mint)</li>
                  <li>• Render: ~$0.003 (per render, Step 5)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* How It Works Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How Ray Tracing Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Phase 1: Neural Network Preview (FREE)</h4>
                <div className="bg-muted p-3 rounded-md text-xs">
                  <code>view_aesthetic(warmth, intensity, depth) → RGB</code>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Mini neural network (3→4→2) predicts aesthetic colors based on style parameters. 
                  Runs on-chain as VIEW function (0 gas cost).
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Phase 2: NFT Minting</h4>
                <div className="bg-muted p-3 rounded-md text-xs">
                  <code>mint(colors, camera) → token_id</code>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Store 21 bytes of rendering parameters on-chain. Creates unique NFT that anyone can render later.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="font-semibold mb-2">Ray-Sphere Intersection Math</h4>
              <div className="bg-muted p-3 rounded-md font-mono text-xs">
                <div>Given: Ray = O + D·t, Sphere = |P - C|² = r²</div>
                <div className="mt-1">Solve: a·t² + b·t + c = 0</div>
                <div className="mt-1">Where: a = D·D, b = 2(O-C)·D, c = (O-C)·(O-C) - r²</div>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Discriminant determines if ray hits sphere. If yes, calculate intersection point and lighting.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}