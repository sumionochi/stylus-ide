'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Sparkles, Download } from 'lucide-react';

interface RenderCanvasProps {
  predictedColors: [number, number, number] | null;
  cameraX: number;
  setCameraX: (value: number) => void;
  cameraY: number;
  setCameraY: (value: number) => void;
  cameraZ: number;
  setCameraZ: (value: number) => void;
  isRendering: boolean;
  renderedPixels: number[] | null;
  nftAddress: string;
  isNftConnected: boolean;
}

export function RenderCanvas({
  predictedColors,
  cameraX,
  setCameraX,
  cameraY,
  setCameraY,
  cameraZ,
  setCameraZ,
  isRendering,
  renderedPixels,
  nftAddress,
  isNftConnected,
}: RenderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Client-side simple sphere preview
  useEffect(() => {
    if (!predictedColors || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 256;
    const height = 256;
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Draw gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#ffffff');
    bgGradient.addColorStop(1, '#5b7fd5');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw sphere with radial gradient (simulating 3D lighting)
    const centerX = width / 2 + cameraX * 10;
    const centerY = height / 2 - cameraY * 10;
    const radius = 80 + cameraZ * 5;

    const gradient = ctx.createRadialGradient(
      centerX - radius * 0.3,
      centerY - radius * 0.3,
      radius * 0.1,
      centerX,
      centerY,
      radius
    );

    const [r, g, b] = predictedColors;
    
    // Light side (top-left)
    gradient.addColorStop(0, `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`);
    // Mid tone
    gradient.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
    // Shadow (bottom-right)
    gradient.addColorStop(1, `rgb(${Math.floor(r * 0.3)}, ${Math.floor(g * 0.3)}, ${Math.floor(b * 0.3)})`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Add subtle highlight
    const highlight = ctx.createRadialGradient(
      centerX - radius * 0.4,
      centerY - radius * 0.4,
      0,
      centerX - radius * 0.4,
      centerY - radius * 0.4,
      radius * 0.3
    );
    highlight.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

  }, [predictedColors, cameraX, cameraY, cameraZ]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = 'ray-tracing-preview.png';
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>3D Render Preview</CardTitle>
        <CardDescription>
          {predictedColors 
            ? 'Client-side preview with predicted colors from MNN'
            : 'Preview colors with neural network first'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Canvas */}
        <div className="flex items-center justify-center bg-muted rounded-md p-4">
          {predictedColors ? (
            <canvas
              ref={canvasRef}
              className="border border-border rounded-md"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="flex items-center justify-center h-64 w-64 text-muted-foreground">
              <div className="text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Generate preview first</p>
              </div>
            </div>
          )}
        </div>

        {/* Camera Controls */}
        {predictedColors && (
          <>
            <div className="space-y-3 pt-4 border-t border-border">
              <h4 className="text-sm font-semibold">Camera Position</h4>
              
              {/* Camera X */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">X-Axis (Left/Right)</Label>
                  <span className="text-xs text-muted-foreground">{cameraX}</span>
                </div>
                <Slider
                  value={[cameraX]}
                  onValueChange={(value) => setCameraX(value[0])}
                  min={-20}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Camera Y */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Y-Axis (Up/Down)</Label>
                  <span className="text-xs text-muted-foreground">{cameraY}</span>
                </div>
                <Slider
                  value={[cameraY]}
                  onValueChange={(value) => setCameraY(value[0])}
                  min={-20}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Camera Z */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Z-Axis (Zoom)</Label>
                  <span className="text-xs text-muted-foreground">{cameraZ}</span>
                </div>
                <Slider
                  value={[cameraZ]}
                  onValueChange={(value) => setCameraZ(value[0])}
                  min={-10}
                  max={10}
                  step={1}
                  className="w-full"
                />
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
              Download Preview
            </Button>

            {/* Info about on-chain rendering */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-md text-xs text-yellow-400">
              <p className="font-medium mb-1">ℹ️ Client-Side Preview</p>
              <p>
                This is a simplified preview. For full on-chain ray tracing with proper lighting and shadows,
                mint an NFT and render on-chain (Step 4).
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}