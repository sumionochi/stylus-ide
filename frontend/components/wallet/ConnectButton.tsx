'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { arbitrum, arbitrumSepolia } from 'wagmi/chains';
import { xaiSepolia, rariTestnet, sankoTestnet, isOrbitChain } from '@/lib/orbit-chains';

export function ConnectButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const supportedChains = useMemo(() => [arbitrumSepolia, 
    arbitrum,
    xaiSepolia,
    rariTestnet,
    sankoTestnet,], []);
  const activeChain = supportedChains.find((c) => c.id === chainId);
  const isWrongNetwork = isConnected && !activeChain;

  // ✅ Prevent hydration mismatch: render stable placeholder until mounted
  if (!mounted) {
    return (
      <Button size="sm" variant="outline" disabled>
        <Wallet className="h-4 w-4 mr-2" />
        Connect Wallet
      </Button>
    );
  }

  if (!isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm">
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {connectors.map((connector) => (
            <DropdownMenuItem
              key={connector.id}
              onClick={() => connect({ connector })}
            >
              {connector.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (isWrongNetwork) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="destructive">
            <AlertCircle className="h-4 w-4 mr-2" />
            Wrong Network
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5 text-sm font-semibold">Switch to:</div>
          <DropdownMenuSeparator />
          {supportedChains.map((c) => (
            <DropdownMenuItem
              key={c.id}
              onClick={() => switchChain({ chainId: c.id })}
            >
              {c.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const displayAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <div className="flex gap-2">
      {/* Chain Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="hidden sm:flex">
            {chain?.name || 'Unknown'}
            {chain && isOrbitChain(chain.id) && (
              <span className="ml-1.5 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                Orbit
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Arbitrum Networks
          </div>
          <DropdownMenuSeparator />
          {supportedChains.filter(c => !isOrbitChain(c.id)).map((supportedChain) => (
            <DropdownMenuItem
              key={supportedChain.id}
              onClick={() => switchChain({ chainId: supportedChain.id })}
              disabled={chainId === supportedChain.id}
            >
              {supportedChain.name}
              {chainId === supportedChain.id && ' ✓'}
            </DropdownMenuItem>
          ))}
          
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
            Orbit Chains
          </div>
          <DropdownMenuSeparator />
          {supportedChains.filter(c => isOrbitChain(c.id)).map((supportedChain) => (
            <DropdownMenuItem
              key={supportedChain.id}
              onClick={() => switchChain({ chainId: supportedChain.id })}
              disabled={chainId === supportedChain.id}
              className="text-xs"
            >
              {supportedChain.name}
              {chainId === supportedChain.id && ' ✓'}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Account Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Wallet className="h-4 w-4 mr-2" />
            {displayAddress}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5 text-sm">
            <div className="font-semibold">Account</div>
            <div className="text-xs text-muted-foreground font-mono">{address}</div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => disconnect()}>
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
