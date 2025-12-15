'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Download, Upload, Sparkles, Brain, Zap } from 'lucide-react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseAbi, type Address } from 'viem';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import Link from 'next/link';

const ML_CONTRACT_ABI = parseAbi([
'function predict(uint8[] pixels) external view returns (uint256)',
'function predictWithConfidence(uint8[] pixels) external view returns (uint256, uint256[])',
'function getModelInfo() external view returns (uint256, uint256, uint256)',
'function isReady() external view returns (bool)',
]);

export default function MLDemoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [contractAddress, setContractAddress] = useState<string>('');
  const [gasUsed, setGasUsed] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<{ input: number; hidden: number; output: number } | null>(null);

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    // Initialize canvas
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== 'mousedown') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setPrediction(null);
    setConfidence([]);
    setGasUsed(null);
  };

  const getPixelData = (): number[] => {
    const canvas = canvasRef.current;
    if (!canvas) return [];

    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Downsample to 28x28
    const downsampledData: number[] = [];
    const stepX = canvas.width / 28;
    const stepY = canvas.height / 28;

    for (let i = 0; i < 28; i++) {
      for (let j = 0; j < 28; j++) {
        const x = Math.floor(j * stepX);
        const y = Math.floor(i * stepY);
        const idx = (y * canvas.width + x) * 4;
        
        // Get grayscale value (using red channel since image is black/white)
        const value = imageData.data[idx];
        downsampledData.push(value);
      }
    }

    return downsampledData;
  };

  const loadModelInfo = async () => {
    if (!publicClient || !contractAddress) return;
  
    try {
      const info = await publicClient.readContract({
        address: contractAddress as Address,
        abi: ML_CONTRACT_ABI,
        functionName: 'getModelInfo', // Changed from 'get_model_info'
      });
  
      setModelInfo({
        input: Number(info[0]),
        hidden: Number(info[1]),
        output: Number(info[2]),
      });
    } catch (error) {
      console.error('Failed to load model info:', error);
    }
  };
  
  const predictOnChain = async () => {
    if (!publicClient || !contractAddress) {
      alert('Please enter a deployed ML contract address');
      return;
    }
  
    setIsProcessing(true);
    setGasUsed(null);
  
    try {
      const pixels = getPixelData();
  
      // Call predict function
      const result = await publicClient.readContract({
        address: contractAddress as Address,
        abi: ML_CONTRACT_ABI,
        functionName: 'predict',
        args: [pixels as any],
      });
  
      setPrediction(Number(result));
  
      // Try to get confidence scores
      try {
        const confResult = await publicClient.readContract({
          address: contractAddress as Address,
          abi: ML_CONTRACT_ABI,
          functionName: 'predictWithConfidence', // Changed from 'predict_with_confidence'
          args: [pixels as any],
        });
  
        const confidenceScores = (confResult[1] as bigint[]).map(n => Number(n));
        setConfidence(confidenceScores);
      } catch (err) {
        // Confidence function might not exist
        console.log('Confidence scores not available');
      }
  
      // Estimate gas
      try {
        const gas = await publicClient.estimateContractGas({
          address: contractAddress as Address,
          abi: ML_CONTRACT_ABI,
          functionName: 'predict',
          args: [pixels as any],
          account: address,
        });
  
        setGasUsed(gas.toString());
      } catch (err) {
        console.log('Could not estimate gas');
      }
  
    } catch (error) {
      console.error('Prediction error:', error);
      alert('Prediction failed. Make sure the contract address is correct and deployed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadTestSample = async (index: number) => {
    try {
      const response = await fetch('/ml-weights/test_samples.json');
      const data = await response.json();
      
      if (index >= data.images.length) return;

      const imageData = data.images[index];
      const label = data.labels[index];

      // Draw image on canvas
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw 28x28 image upscaled to canvas size
      const cellWidth = canvas.width / 28;
      const cellHeight = canvas.height / 28;

      for (let i = 0; i < 28; i++) {
        for (let j = 0; j < 28; j++) {
          const pixelValue = imageData[i * 28 + j];
          const brightness = Math.floor(pixelValue * 255);
          
          ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
          ctx.fillRect(j * cellWidth, i * cellHeight, cellWidth, cellHeight);
        }
      }

      console.log(`Loaded test sample ${index}, actual digit: ${label}`);
    } catch (error) {
      console.error('Failed to load test sample:', error);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg md:text-xl font-bold text-primary hover:opacity-80">
            Stylus IDE
          </Link>
          <span className="text-sm text-muted-foreground hidden sm:inline">→ ML Demo</span>
        </div>
        <ConnectButton />
      </header>

      <div className="container mx-auto p-6 max-w-6xl">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">On-Chain ML Inference</h1>
          </div>
          <p className="text-muted-foreground">
            Draw a digit (0-9) and get real-time predictions from a neural network running on Arbitrum
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Drawing Canvas */}
          <Card>
            <CardHeader>
              <CardTitle>Draw a Digit</CardTitle>
              <CardDescription>
                Draw a number 0-9 on the canvas below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={280}
                  height={280}
                  className="border-2 border-border rounded-lg cursor-crosshair mx-auto"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  style={{ touchAction: 'none' }}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={clearCanvas} variant="outline" className="flex-1">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button onClick={() => predictOnChain()} disabled={isProcessing || !contractAddress} className="flex-1">
                  {isProcessing ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Predict
                    </>
                  )}
                </Button>
              </div>

              {/* Test Samples */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Or load a test sample:</p>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => loadTestSample(i)}
                      className="h-10"
                    >
                      #{i}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results & Config */}
          <div className="space-y-6">
            {/* Contract Config */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Configuration</CardTitle>
                <CardDescription>
                  Enter your deployed ML contract address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  />
                  {contractAddress && (
                    <Button
                      onClick={loadModelInfo}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Load Model Info
                    </Button>
                  )}
                </div>

                {modelInfo && (
                  <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                    <p><strong>Architecture:</strong></p>
                    <p className="text-muted-foreground">
                      {modelInfo.input} → {modelInfo.hidden} → {modelInfo.output}
                    </p>
                  </div>
                )}

                {!contractAddress && (
                  <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-md text-sm text-blue-400">
                    Deploy the ML contract from the main IDE first, then paste the address here.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prediction Results */}
            <Card>
              <CardHeader>
                <CardTitle>Prediction Results</CardTitle>
                <CardDescription>
                  On-chain neural network inference
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {prediction !== null ? (
                  <>
                    <div className="text-center">
                      <div className="text-6xl font-bold text-primary mb-2">
                        {prediction}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Predicted Digit
                      </p>
                    </div>

                    {confidence.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Confidence Scores:</p>
                        {confidence.map((conf, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs w-6">{idx}</span>
                            <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                              <div
                                className={`h-full ${idx === prediction ? 'bg-primary' : 'bg-primary/50'}`}
                                style={{ width: `${conf}%` }}
                              />
                            </div>
                            <span className="text-xs w-12 text-right">{conf}%</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {gasUsed && (
                      <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                        <p><strong>Gas Used:</strong></p>
                        <p className="text-muted-foreground font-mono">
                          {Number(gasUsed).toLocaleString()} gas
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      Draw a digit and click Predict
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Model Info */}
            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-muted-foreground">
                <p>
                  1. <strong>Draw</strong> a digit on the canvas (or load a test sample)
                </p>
                <p>
                  2. Image is <strong>downsampled</strong> to 28×28 pixels
                </p>
                <p>
                  3. Neural network runs <strong>on-chain</strong> using Stylus
                </p>
                <p>
                  4. Returns predicted digit (0-9) and confidence scores
                </p>
                <p className="pt-2 border-t border-border mt-4">
                  <strong>Model:</strong> 2-layer MLP trained on MNIST dataset (94.2% accuracy)
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}