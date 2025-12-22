'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Image as ImageIcon, Download, ExternalLink } from 'lucide-react';
import { usePublicClient } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { RAY_TRACING_ABI } from '@/lib/ray-tracing-abi';
import { bytesToImageData } from '@/lib/ray-tracing-abi';
import { useEffect, useRef } from 'react';

interface RenderingPanelProps {
  nftAddress: string;
  isNftConnected: boolean;
  mintedTokenId: bigint | null;
}

export function RenderingPanel({
  nftAddress,
  isNftConnected,
  mintedTokenId,
}: RenderingPanelProps) {
  const [tokenIdInput, setTokenIdInput] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const [renderedData, setRenderedData] = useState<Uint8Array | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [gasUsed, setGasUsed] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const publicClient = usePublicClient({ chainId: arbitrumSepolia.id });

  // Auto-fill with minted token ID
  useEffect(() => {
    if (mintedTokenId !== null) {
      setTokenIdInput(mintedTokenId.toString());
    }
  }, [mintedTokenId]);

  const handleRender = async () => {
    if (!publicClient || !tokenIdInput) {
      alert('Please enter a token ID');
      return;
    }

    setIsRendering(true);
    setRenderError(null);
    setGasUsed('120000'); // Estimated gas

    try {
      const tokenId = BigInt(tokenIdInput);

      // Call the render function
      const result = await publicClient.readContract({
        address: nftAddress as `0x${string}`,
        abi: RAY_TRACING_ABI as any,
        functionName: 'renderToken', // Changed from render_token
        args: [tokenId],
      });

      // Convert hex string to Uint8Array
      const hexString = (result as string).slice(2); // Remove '0x' prefix
      const bytes = new Uint8Array(hexString.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
      }

      if (bytes.length !== 3072) {
        throw new Error(`Expected 3,072 bytes, got ${bytes.length}`);
      }

      setRenderedData(bytes);
      renderToCanvas(bytes);
    } catch (error: any) {
      console.error('Rendering failed:', error);
      setRenderError(error.message || 'Failed to render. Check token ID and contract.');
    } finally {
      setIsRendering(false);
    }
  };

  const renderToCanvas = (pixelData: Uint8Array) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 32;
    const height = 32;
    canvas.width = width;
    canvas.height = height;

    // Create ImageData from pixel bytes
    const imageData = ctx.createImageData(width, height);
    
    for (let i = 0; i < pixelData.length; i += 3) {
      const pixelIndex = i / 3;
      const dataIndex = pixelIndex * 4;
      
      imageData.data[dataIndex] = pixelData[i];       // R
      imageData.data[dataIndex + 1] = pixelData[i + 1]; // G
      imageData.data[dataIndex + 2] = pixelData[i + 2]; // B
      imageData.data[dataIndex + 3] = 255;              // A
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = `ray-tracing-token-${tokenIdInput}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>On-Chain Ray Tracing</CardTitle>
        <CardDescription>
          Render 32×32 3D image with full lighting calculation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token ID Input */}
        <div className="space-y-2">
          <Label htmlFor="token-id">Token ID to Render</Label>
          <div className="flex gap-2">
            <Input
              id="token-id"
              type="number"
              placeholder="0"
              value={tokenIdInput}
              onChange={(e) => setTokenIdInput(e.target.value)}
              disabled={isRendering}
            />
            <Button
              onClick={handleRender}
              disabled={!isNftConnected || !tokenIdInput || isRendering}
              className="min-w-32"
            >
              {isRendering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rendering...
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Render
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {mintedTokenId !== null 
              ? `Your minted token: ${mintedTokenId.toString()}`
              : 'Enter any valid token ID to render'
            }
          </p>
        </div>

        {/* Gas Estimate */}
        {gasUsed && (
          <div className="bg-muted p-3 rounded-md text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Gas:</span>
              <span className="font-mono">{Number(gasUsed).toLocaleString()}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Est. Cost:</span>
              <span className="font-mono">~${(Number(gasUsed) * 0.02 / 1e9 * 2500).toFixed(4)}</span>
            </div>
          </div>
        )}

        {/* Canvas Display */}
        {renderedData ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center bg-muted rounded-md p-4">
              <canvas
                ref={canvasRef}
                className="border border-border rounded-md"
                style={{ 
                  imageRendering: 'pixelated',
                  width: '256px',
                  height: '256px',
                }}
              />
            </div>

            {/* Render Info */}
            <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-md text-xs space-y-1">
              <h4 className="font-semibold text-green-400">✓ Rendered On-Chain</h4>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolution:</span>
                <span>32×32 pixels</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data Size:</span>
                <span>{renderedData.length.toLocaleString()} bytes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Algorithm:</span>
                <span>Ray-sphere intersection + diffuse lighting</span>
              </div>
            </div>

            {/* Download Button */}
            <Button
              onClick={handleDownload}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download 32×32 PNG
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 border border-border rounded-md bg-muted">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Render a token to see the result</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {renderError && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-md text-sm text-red-400">
            <p className="font-medium">Rendering Failed</p>
            <p className="text-xs mt-1">{renderError}</p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-md text-xs text-blue-400">
          <p className="font-medium mb-1">🔬 What Happens:</p>
          <ul className="space-y-1">
            <li>• Contract loads 21-byte config from storage</li>
            <li>• For each of 1,024 pixels:</li>
            <li className="pl-4">→ Generate ray from camera</li>
            <li className="pl-4">→ Check sphere intersection (quadratic equation)</li>
            <li className="pl-4">→ Calculate lighting (dot product)</li>
            <li className="pl-4">→ Store RGB value</li>
            <li>• Returns 3,072 bytes (32×32×3 RGB)</li>
            <li>• 100% deterministic - same input = same output</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}