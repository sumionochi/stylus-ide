'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, Sparkles } from 'lucide-react';
import { usePublicClient } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { MNN_ABI } from '@/lib/ray-tracing-abi';

interface StyleControlsProps {
  warmth: number;
  setWarmth: (value: number) => void;
  intensity: number;
  setIntensity: (value: number) => void;
  depth: number;
  setDepth: (value: number) => void;
  mnnAddress: string;
  predictedColors: [number, number, number] | null;
  setPredictedColors: (colors: [number, number, number] | null) => void;
}

export function StyleControls({
  warmth,
  setWarmth,
  intensity,
  setIntensity,
  depth,
  setDepth,
  mnnAddress,
  predictedColors,
  setPredictedColors,
}: StyleControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const publicClient = usePublicClient({ chainId: arbitrumSepolia.id });

  const handlePreview = async () => {
    if (!publicClient) return;

    setIsLoading(true);

    try {
      // Convert 0-100 to 0-10^18 scale
      const warmthScaled = BigInt(Math.floor((warmth / 100) * 1e18));
      const intensityScaled = BigInt(Math.floor((intensity / 100) * 1e18));
      const depthScaled = BigInt(Math.floor((depth / 100) * 1e18));

      const result = await publicClient.readContract({
        address: mnnAddress as `0x${string}`,
        abi: MNN_ABI as any,
        functionName: 'viewAesthetic', // Changed from view_aesthetic
        args: [warmthScaled, intensityScaled, depthScaled],
      });

      const [r, g, b] = result as [number, number, number];
      setPredictedColors([r, g, b]);
    } catch (error) {
      console.error('Preview failed:', error);
      alert('Failed to preview colors. Check contract connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Style Parameters</CardTitle>
        <CardDescription>
          Adjust aesthetic parameters for neural network prediction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warmth Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Warmth</Label>
            <span className="text-sm text-muted-foreground">{warmth}%</span>
          </div>
          <Slider
            value={[warmth]}
            onValueChange={(value) => setWarmth(value[0])}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Cool tones (0%) to warm tones (100%)
          </p>
        </div>

        {/* Intensity Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Intensity</Label>
            <span className="text-sm text-muted-foreground">{intensity}%</span>
          </div>
          <Slider
            value={[intensity]}
            onValueChange={(value) => setIntensity(value[0])}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Subtle (0%) to vibrant (100%)
          </p>
        </div>

        {/* Depth Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Depth</Label>
            <span className="text-sm text-muted-foreground">{depth}%</span>
          </div>
          <Slider
            value={[depth]}
            onValueChange={(value) => setDepth(value[0])}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Flat (0%) to dimensional (100%)
          </p>
        </div>

        {/* Preview Button */}
        <Button
          onClick={handlePreview}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Predicting...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Preview Colors (FREE)
            </>
          )}
        </Button>

        {/* Predicted Colors Display */}
        {predictedColors && (
          <div className="space-y-3">
            <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-md">
              <h4 className="text-sm font-semibold text-green-400 mb-3">✓ Neural Network Prediction</h4>
              <div className="flex items-center gap-3">
                <div
                  className="w-20 h-20 rounded-md border-2 border-green-500/50 shadow-lg"
                  style={{
                    backgroundColor: `rgb(${predictedColors[0]}, ${predictedColors[1]}, ${predictedColors[2]})`,
                  }}
                />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Red</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-12 h-3 rounded-sm border border-border"
                        style={{ backgroundColor: `rgb(${predictedColors[0]}, 0, 0)` }}
                      />
                      <span className="font-mono text-xs w-8">{predictedColors[0]}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Green</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-12 h-3 rounded-sm border border-border"
                        style={{ backgroundColor: `rgb(0, ${predictedColors[1]}, 0)` }}
                      />
                      <span className="font-mono text-xs w-8">{predictedColors[1]}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Blue</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-12 h-3 rounded-sm border border-border"
                        style={{ backgroundColor: `rgb(0, 0, ${predictedColors[2]})` }}
                      />
                      <span className="font-mono text-xs w-8">{predictedColors[2]}</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-green-400 mt-3 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Computed on-chain with 0 gas cost (VIEW function)
              </p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-md text-xs text-blue-400">
          <p className="font-medium mb-1">💡 How It Works:</p>
          <p>
            The Mini Neural Network (3→4→2 architecture) runs entirely on-chain as a VIEW function.
            It predicts aesthetic RGB colors based on your style parameters - completely free!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}