'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Zap, TrendingDown, ExternalLink } from 'lucide-react';
import { arbitrumSepolia } from 'wagmi/chains';
import { orbitChains, getOrbitChain } from '@/lib/orbit-chains';
import { createPublicClient, http, type Address, type Abi } from 'viem';

interface BenchmarkResult {
  chainId: number;
  chainName: string;
  gasToken: string;
  gasUsed: bigint;
  estimatedCost: string; // in USD
  success: boolean;
  error?: string;
  explorerUrl?: string;
}

interface BenchmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  abi: Abi;
  functionName: string;
  args?: any[];
  title?: string;
  description?: string;
}

export function BenchmarkDialog({
  open,
  onOpenChange,
  abi,
  functionName,
  args = [],
  title = 'Multi-Chain Gas Benchmark',
  description = 'Compare gas costs across Arbitrum and Orbit chains',
}: BenchmarkDialogProps) {
  const [addresses, setAddresses] = useState<Record<number, string>>({
    [arbitrumSepolia.id]: '',
    ...Object.fromEntries(orbitChains.map((chain) => [chain.id, ''])),
  });
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const allChains = [
    { id: arbitrumSepolia.id, name: arbitrumSepolia.name, rpc: arbitrumSepolia.rpcUrls.default.http[0], gasToken: 'ETH', explorer: 'https://sepolia.arbiscan.io' },
    ...orbitChains.map((chain) => ({
      id: chain.id,
      name: chain.name,
      rpc: chain.chain.rpcUrls.default.http[0],
      gasToken: chain.gasToken,
      explorer: chain.chain.blockExplorers?.default.url,
    })),
  ];

  const runBenchmark = async () => {
    setIsRunning(true);
    setResults([]);

    const benchmarkResults: BenchmarkResult[] = [];

    // Filter chains that have addresses
    const chainsToTest = allChains.filter((chain) => addresses[chain.id]?.trim());

    if (chainsToTest.length === 0) {
      alert('Please enter at least one contract address');
      setIsRunning(false);
      return;
    }

    // Run benchmarks in parallel
    await Promise.all(
      chainsToTest.map(async (chain) => {
        try {
          const client = createPublicClient({
            chain: chain.id === arbitrumSepolia.id 
              ? arbitrumSepolia 
              : orbitChains.find(c => c.id === chain.id)!.chain,
            transport: http(chain.rpc),
          });

          const contractAddress = addresses[chain.id] as Address;

          // Estimate gas
          const gas = await client.estimateContractGas({
            address: contractAddress,
            abi,
            functionName,
            args,
          });

          // Estimate cost (rough calculation)
          // Different chains have different gas prices
          const gasPriceGwei = chain.gasToken === 'ETH' ? 0.02 : 0.01; // Orbit chains typically cheaper
          const ethPrice = 2500; // $2500 per ETH (rough estimate)
          const costUSD = ((Number(gas) * gasPriceGwei) / 1e9) * ethPrice;

          benchmarkResults.push({
            chainId: chain.id,
            chainName: chain.name,
            gasToken: chain.gasToken,
            gasUsed: gas,
            estimatedCost: costUSD.toFixed(6),
            success: true,
            explorerUrl: chain.explorer ? `${chain.explorer}/address/${contractAddress}` : undefined,
          });
        } catch (error) {
          benchmarkResults.push({
            chainId: chain.id,
            chainName: chain.name,
            gasToken: chain.gasToken,
            gasUsed: BigInt(0),
            estimatedCost: '0',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })
    );

    // Sort by gas used (successful ones first, then by gas)
    benchmarkResults.sort((a, b) => {
      if (a.success && !b.success) return -1;
      if (!a.success && b.success) return 1;
      return Number(a.gasUsed) - Number(b.gasUsed);
    });

    setResults(benchmarkResults);
    setIsRunning(false);
  };

  const cheapestChain = results.find((r) => r.success);
  const avgGas = results.filter(r => r.success).length > 0
    ? results.filter(r => r.success).reduce((sum, r) => sum + Number(r.gasUsed), 0) / results.filter(r => r.success).length
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Address Input Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Contract Addresses</h3>
              <p className="text-xs text-muted-foreground">
                Enter addresses for chains where you deployed
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Arbitrum Sepolia */}
              <div className="space-y-2">
                <Label htmlFor="arb-sepolia" className="text-sm">
                  Arbitrum Sepolia
                  <span className="ml-1 text-xs text-muted-foreground">(ETH)</span>
                </Label>
                <Input
                  id="arb-sepolia"
                  placeholder="0x..."
                  value={addresses[arbitrumSepolia.id]}
                  onChange={(e) =>
                    setAddresses({ ...addresses, [arbitrumSepolia.id]: e.target.value })
                  }
                  disabled={isRunning}
                />
              </div>

              {/* Orbit Chains */}
              {orbitChains.map((chain) => (
                <div key={chain.id} className="space-y-2">
                  <Label htmlFor={`chain-${chain.id}`} className="text-sm flex items-center gap-1">
                    {chain.name}
                    <span className="text-xs text-muted-foreground">({chain.gasToken})</span>
                    {chain.recommended && (
                      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                        Orbit
                      </span>
                    )}
                  </Label>
                  <Input
                    id={`chain-${chain.id}`}
                    placeholder="0x..."
                    value={addresses[chain.id]}
                    onChange={(e) =>
                      setAddresses({ ...addresses, [chain.id]: e.target.value })
                    }
                    disabled={isRunning}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Run Benchmark Button */}
          <Button onClick={runBenchmark} disabled={isRunning} className="w-full">
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Benchmark...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run Benchmark
              </>
            )}
          </Button>

          {/* Results Section */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Benchmark Results</h3>

              {/* Summary Stats */}
              {cheapestChain && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className="h-4 w-4 text-green-500" />
                      <span className="text-xs font-medium text-green-400">Cheapest Chain</span>
                    </div>
                    <p className="text-sm font-semibold">{cheapestChain.chainName}</p>
                    <p className="text-xs text-muted-foreground">{Number(cheapestChain.gasUsed).toLocaleString()} gas</p>
                  </div>

                  <div className="bg-muted rounded-lg p-3">
                    <span className="text-xs font-medium text-muted-foreground block mb-1">Average Gas</span>
                    <p className="text-sm font-semibold">{Math.round(avgGas).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Across {results.filter(r => r.success).length} chains</p>
                  </div>

                  <div className="bg-muted rounded-lg p-3">
                    <span className="text-xs font-medium text-muted-foreground block mb-1">Function</span>
                    <p className="text-sm font-semibold font-mono">{functionName}()</p>
                    <p className="text-xs text-muted-foreground">{args.length} args</p>
                  </div>
                </div>
              )}

              {/* Results Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Chain</th>
                      <th className="text-left p-3 font-medium">Gas Token</th>
                      <th className="text-right p-3 font-medium">Gas Used</th>
                      <th className="text-right p-3 font-medium">Est. Cost (USD)</th>
                      <th className="text-center p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr
                        key={result.chainId}
                        className={`border-t ${
                          result.success && result.chainId === cheapestChain?.chainId
                            ? 'bg-green-500/5'
                            : ''
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{result.chainName}</span>
                            {result.success && result.chainId === cheapestChain?.chainId && (
                              <TrendingDown className="h-3 w-3 text-green-500" />
                            )}
                            {result.explorerUrl && (
                              <a
                                href={result.explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-xs font-mono">{result.gasToken}</span>
                        </td>
                        <td className="p-3 text-right font-mono">
                          {result.success ? Number(result.gasUsed).toLocaleString() : '-'}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {result.success ? `$${result.estimatedCost}` : '-'}
                        </td>
                        <td className="p-3 text-center">
                          {result.success ? (
                            <span className="text-xs text-green-500">✓ Success</span>
                          ) : (
                            <span className="text-xs text-destructive" title={result.error}>
                              ✗ Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Insights */}
              {cheapestChain && results.filter(r => r.success).length > 1 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
                  <p className="font-medium text-blue-400 mb-2">💡 Insights:</p>
                  <ul className="space-y-1 text-blue-300 text-xs">
                    {orbitChains.some(c => results.find(r => r.chainId === c.id && r.success)) && (
                      <li>
                        • Orbit chains show similar gas usage but may have lower gas prices
                      </li>
                    )}
                    <li>
                      • Gas costs vary by network load and gas token economics
                    </li>
                    <li>
                      • For high-frequency operations, choose chains with lowest costs
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}