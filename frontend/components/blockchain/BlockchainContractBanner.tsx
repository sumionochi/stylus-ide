'use client';

import { ExternalLink, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BlockchainContractBannerProps {
  address: string;
  name: string;
  chain: string;
  verified: boolean;
  explorerUrl: string;
  compiler?: string;
}

export function BlockchainContractBanner({
  address,
  name,
  chain,
  verified,
  explorerUrl,
  compiler,
}: BlockchainContractBannerProps) {
  return (
    <div className="h-10 border-b border-border bg-purple-500/10 flex items-center justify-between px-4 text-xs">
      <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          <span className="font-medium">{name}</span>
        </div>
        
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
        </div>
        
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span>on {chain}</span>
        </div>
        
        {verified && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            <span className="text-xs">Verified</span>
          </div>
        )}
        
        {compiler && (
          <div className="hidden md:block text-muted-foreground text-xs">
            {compiler}
          </div>
        )}
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs gap-1"
        onClick={() => window.open(explorerUrl, '_blank')}
      >
        View on Explorer
        <ExternalLink className="h-3 w-3" />
      </Button>
    </div>
  );
}