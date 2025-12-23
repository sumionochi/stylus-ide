'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 px-1">
        <div className="flex items-center justify-center gap-2">
          <Rocket className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Explore Orbit Chains
          </h2>
        </div>

        <p className="text-muted-foreground max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed px-2 sm:px-0">
          Arbitrum Orbit chains are app-specific L3s with customizable features,
          lower costs, and tailored infrastructure. Deploy your Stylus contracts
          to these chains for optimized performance.
        </p>
      </div>

      {/* Chain Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Why Deploy to Orbit Chains?
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-primary text-sm">Cost Optimization</h4>
              <ul className="space-y-1 text-muted-foreground text-xs leading-relaxed">
                <li>• Lower gas prices than L2</li>
                <li>• Custom gas token options</li>
                <li>• Reduced transaction costs by up to 60%</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-primary text-sm">Customization</h4>
              <ul className="space-y-1 text-muted-foreground text-xs leading-relaxed">
                <li>• App-specific optimizations</li>
                <li>• Custom sequencing logic</li>
                <li>• Tailored governance models</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-primary text-sm">Performance</h4>
              <ul className="space-y-1 text-muted-foreground text-xs leading-relaxed">
                <li>• Faster block times</li>
                <li>• Dedicated infrastructure</li>
                <li>• Predictable throughput</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-primary text-sm">Stylus Benefits</h4>
              <ul className="space-y-1 text-muted-foreground text-xs leading-relaxed">
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
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Quick Start Guide</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Deploy your first contract to an Orbit chain
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-3 text-sm">
          <div className="space-y-3">
            {[
              {
                title: 'Get testnet tokens',
                desc: 'Click the faucet button in the header to get free testnet tokens for any Orbit chain',
              },
              {
                title: 'Switch network',
                desc: 'Use the chain selector in your wallet or click "Switch Network" on any Orbit card below',
              },
              {
                title: 'Compile and deploy',
                desc: 'Use the same Stylus contracts - they work on all Orbit chains without modification',
              },
              {
                title: 'Compare gas costs',
                desc: 'Use the "Benchmark Orbit" feature to compare gas usage across chains',
              },
            ].map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
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
  const hasExplorer = useMemo(
    () => Boolean(chain.chain.blockExplorers?.default?.url),
    [chain.chain.blockExplorers]
  );

  return (
    <Card
      className={[
        'h-full',
        chain.recommended ? 'border-primary/50' : '',
      ].join(' ')}
    >
      <CardHeader className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-base leading-tight wrap-break-words">
              {chain.name}
            </CardTitle>
            <CardDescription className="text-xs leading-snug">
              {chain.focus}
            </CardDescription>
          </div>

          {chain.recommended && (
            <Badge variant="default" className="text-[11px] px-2 py-0.5 shrink-0">
              Recommended
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0 space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {chain.description}
        </p>

        {/* Gas Token */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">Gas Token:</span>
          <Badge variant="outline" className="font-mono text-[11px] max-w-[60%] truncate">
            {chain.gasToken}
          </Badge>
        </div>

        {/* Benefits */}
        <div className="space-y-1">
          <p className="text-xs font-medium">Key Benefits:</p>
          <ul className="space-y-0.5">
            {chain.benefits.slice(0, 2).map((benefit, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                • {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-3 border-t border-border">
          <Button onClick={onSwitchChain} size="sm" className="w-full">
            <Rocket className="h-3.5 w-3.5 mr-2" />
            Switch Network
          </Button>

          <div className={hasExplorer ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1'}>
            <Button
              variant="outline"
              size="sm"
              onClick={onCopyRpc}
              className="text-xs w-full"
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy RPC
                </>
              )}
            </Button>

            {hasExplorer && (
              <Button variant="outline" size="sm" asChild className="text-xs w-full">
                <a
                  href={chain.chain.blockExplorers!.default.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Explorer
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Chain ID for reference */}
        <p className="text-xs text-muted-foreground text-center pt-3 border-t border-border">
          Chain ID: <span className="font-mono">{chain.id}</span>
        </p>
      </CardContent>
    </Card>
  );
}
