'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Rocket, Zap, Copy, Check } from 'lucide-react';
import { orbitChains, type OrbitChainInfo } from '@/lib/orbit-chains';
import { useSwitchChain } from 'wagmi';

export function OrbitExplorer() {
  const { switchChain } = useSwitchChain();
  const [copiedRpc, setCopiedRpc] = useState<number | null>(null);

  const copyRpc = async (chainId: number, rpc: string) => {
    try {
      await navigator.clipboard.writeText(rpc);
      setCopiedRpc(chainId);
      setTimeout(() => setCopiedRpc(null), 2000);
    } catch (err) {
      console.error('Failed to copy RPC:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Rocket className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Explore Orbit Chains</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
          Arbitrum Orbit chains are app-specific L3s with customizable features, lower costs, and tailored infrastructure.
          Deploy your Stylus contracts to these chains for optimized performance.
        </p>
      </div>

      {/* Chain Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orbitChains.map((chain) => (
          <OrbitChainCard
            key={chain.id}
            chain={chain}
            onSwitchChain={() => switchChain({ chainId: chain.id })}
            onCopyRpc={() => copyRpc(chain.id, chain.chain.rpcUrls.default.http[0])}
            isCopied={copiedRpc === chain.id}
          />
        ))}
      </div>

      {/* Why Orbit Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Why Deploy to Orbit Chains?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-primary">Cost Optimization</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• Lower gas prices than L2</li>
                <li>• Custom gas token options</li>
                <li>• Reduced transaction costs by up to 60%</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-primary">Customization</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• App-specific optimizations</li>
                <li>• Custom sequencing logic</li>
                <li>• Tailored governance models</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-primary">Performance</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• Faster block times</li>
                <li>• Dedicated infrastructure</li>
                <li>• Predictable throughput</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-primary">Stylus Benefits</h4>
              <ul className="space-y-1 text-muted-foreground text-xs">
                <li>• ML inference at lower cost</li>
                <li>• Complex compute operations</li>
                <li>• High-frequency contract calls</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
          <CardDescription>Deploy your first contract to an Orbit chain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
                1
              </div>
              <div>
                <p className="font-medium">Get testnet tokens</p>
                <p className="text-xs text-muted-foreground">
                  Click the faucet button in the header to get free testnet tokens for any Orbit chain
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
                2
              </div>
              <div>
                <p className="font-medium">Switch network</p>
                <p className="text-xs text-muted-foreground">
                  Use the chain selector in your wallet or click "Switch Network" on any Orbit card below
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
                3
              </div>
              <div>
                <p className="font-medium">Compile and deploy</p>
                <p className="text-xs text-muted-foreground">
                  Use the same Stylus contracts - they work on all Orbit chains without modification
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
                4
              </div>
              <div>
                <p className="font-medium">Compare gas costs</p>
                <p className="text-xs text-muted-foreground">
                  Use the "Benchmark Orbit" feature to compare gas usage across chains
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface OrbitChainCardProps {
  chain: OrbitChainInfo;
  onSwitchChain: () => void;
  onCopyRpc: () => void;
  isCopied: boolean;
}

function OrbitChainCard({ chain, onSwitchChain, onCopyRpc, isCopied }: OrbitChainCardProps) {
  return (
    <Card className={`${chain.recommended ? 'border-primary/50' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-base">{chain.name}</CardTitle>
            <CardDescription className="text-xs">{chain.focus}</CardDescription>
          </div>
          {chain.recommended && (
            <Badge variant="default" className="text-xs">
              Recommended
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{chain.description}</p>

        {/* Gas Token */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Gas Token:</span>
          <Badge variant="outline" className="font-mono">
            {chain.gasToken}
          </Badge>
        </div>

        {/* Benefits */}
        <div className="space-y-1">
          <p className="text-xs font-medium">Key Benefits:</p>
          <ul className="space-y-0.5">
            {chain.benefits.slice(0, 2).map((benefit, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                • {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2 border-t border-border">
          <Button onClick={onSwitchChain} size="sm" className="w-full">
            <Rocket className="h-3 w-3 mr-2" />
            Switch Network
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCopyRpc}
              className="text-xs"
            >
              {isCopied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy RPC
                </>
              )}
            </Button>

            {chain.chain.blockExplorers?.default.url && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs"
              >
                <a
                  href={chain.chain.blockExplorers.default.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Explorer
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Chain ID for reference */}
        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          Chain ID: <span className="font-mono">{chain.id}</span>
        </p>
      </CardContent>
    </Card>
  );
}