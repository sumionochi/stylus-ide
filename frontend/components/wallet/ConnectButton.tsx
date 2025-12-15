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

export function ConnectButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const supportedChains = useMemo(() => [arbitrumSepolia, arbitrum], []);
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
            {activeChain?.name ?? 'Unknown : Add Chain'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {supportedChains.map((c) => (
            <DropdownMenuItem
              key={c.id}
              onClick={() => switchChain({ chainId: c.id })}
              disabled={chainId === c.id}
            >
              {c.name}
              {chainId === c.id && ' ✓'}
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
