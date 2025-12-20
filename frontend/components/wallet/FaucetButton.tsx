'use client';

import { useEffect, useState } from 'react';
import { useChainId, useAccount } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { Button } from '@/components/ui/button';
import { Droplet, ExternalLink, Info } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';

const FAUCETS = [
  {
    name: 'Triangle Platform',
    url: 'https://faucet.triangleplatform.com/arbitrum/sepolia',
    description: '0.001 ETH - No requirements',
    recommended: true,
  },
  {
    name: 'LearnWeb3 Faucet',
    url: 'https://learnweb3.io/faucets/arbitrum_sepolia',
    description: '0.0001 ETH - GitHub login',
    recommended: true,
  },
  {
    name: 'Arbitrum Bridge (Sepolia → Arb Sepolia)',
    url: 'https://bridge.arbitrum.io/?destinationChain=arbitrum-sepolia&sourceChain=sepolia',
    description: 'Bridge from Ethereum Sepolia',
    isBridge: true,
  },
  {
    name: 'Alchemy Faucet',
    url: 'https://www.alchemy.com/faucets/arbitrum-sepolia',
    description: 'Requires Alchemy account',
  },
  {
    name: 'Chainlink Faucet',
    url: 'https://faucets.chain.link/arbitrum-sepolia',
    description: 'Requires mainnet balance',
  },

  // Orbit chain faucets
  {
    name: 'XAI Testnet Faucet',
    url: 'https://faucet.xai.games',
    description: 'Get sXAI testnet tokens',
    isOrbit: true,
  },
  {
    name: 'ApeChain Curtis Faucet',
    url: 'https://curtis.hub.caldera.xyz/',
    description: 'Get APE testnet tokens (via Caldera)',
    isOrbit: true,
  },
  {
    name: 'Nitrogen Testnet Faucet',
    url: 'https://nitrogen-faucet.altlayer.io/',
    description: 'Get ETH for Nitrogen testnet',
    isOrbit: true,
  },
];

// Ethereum Sepolia faucets (to bridge from)
const ETH_SEPOLIA_FAUCETS = [
  {
    name: 'Alchemy Sepolia Faucet',
    url: 'https://www.alchemy.com/faucets/ethereum-sepolia',
    description: 'Get ETH Sepolia first',
  },
  {
    name: 'Infura Sepolia Faucet',
    url: 'https://www.infura.io/faucet/sepolia',
    description: 'Alternative Sepolia source',
  },
];

export function FaucetButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chainId = useChainId();
  const { address } = useAccount();

  // ✅ Prevent hydration mismatch: render nothing until client mounted
  if (!mounted) {
    return null;
  }

  const recommendedFaucets = FAUCETS.filter((f) => f.recommended);
  const bridgeFaucets = FAUCETS.filter((f) => f.isBridge);
  const orbitFaucets = FAUCETS.filter((f) => f.isOrbit);
  const otherFaucets = FAUCETS.filter((f) => !f.recommended && !f.isBridge && !f.isOrbit);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="hidden sm:flex">
          <Droplet className="h-4 w-4 mr-2" />
          Faucet
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto custom-scrollbar">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Droplet className="h-4 w-4" />
          Get Free Testnet ETH
        </DropdownMenuLabel>

        <div className="px-2 py-2">
          <Alert className="border-blue-500/20 bg-blue-500/10">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-xs text-blue-400">
              You're on <strong>Arbitrum Sepolia</strong> (testnet) - all ETH is free!
            </AlertDescription>
          </Alert>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Direct Faucets (Recommended)
        </DropdownMenuLabel>

        {recommendedFaucets.map((faucet) => (
          <DropdownMenuItem key={faucet.name} asChild className="cursor-pointer">
            <a
              href={faucet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between w-full"
            >
              <div className="flex-1">
                <div className="font-medium text-sm flex items-center gap-2">
                  {faucet.name}
                  <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                    Easy
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{faucet.description}</div>
              </div>
              <ExternalLink className="h-4 w-4 ml-2 shrink-0" />
            </a>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Bridge Method (2 Steps)
        </DropdownMenuLabel>

        <div className="px-2 py-2 text-xs text-muted-foreground space-y-2">
          <div>
            <strong>Step 1:</strong> Get ETH Sepolia from:
          </div>
          {ETH_SEPOLIA_FAUCETS.map((faucet) => (
            <a
              key={faucet.name}
              href={faucet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-foreground pl-4"
            >
              <ExternalLink className="h-3 w-3" />
              {faucet.name}
            </a>
          ))}
          <div className="pt-1">
            <strong>Step 2:</strong> Bridge to Arbitrum Sepolia:
          </div>
        </div>

        {bridgeFaucets.map((faucet) => (
          <DropdownMenuItem key={faucet.name} asChild className="cursor-pointer">
            <a
              href={faucet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between w-full"
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{faucet.name}</div>
                <div className="text-xs text-muted-foreground">{faucet.description}</div>
              </div>
              <ExternalLink className="h-4 w-4 ml-2 shrink-0" />
            </a>
          </DropdownMenuItem>
        ))}

        {/* ✅ Orbit section */}
        {orbitFaucets.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Orbit Chain Faucets
            </DropdownMenuLabel>

            {orbitFaucets.map((faucet) => (
              <DropdownMenuItem key={faucet.name} asChild className="cursor-pointer">
                <a
                  href={faucet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between w-full"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{faucet.name}</div>
                    <div className="text-xs text-muted-foreground">{faucet.description}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 ml-2 shrink-0" />
                </a>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground">Other Options</DropdownMenuLabel>

        {otherFaucets.map((faucet) => (
          <DropdownMenuItem key={faucet.name} asChild className="cursor-pointer">
            <a
              href={faucet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between w-full"
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{faucet.name}</div>
                <div className="text-xs text-muted-foreground">{faucet.description}</div>
              </div>
              <ExternalLink className="h-4 w-4 ml-2 shrink-0" />
            </a>
          </DropdownMenuItem>
        ))}

        {address && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 text-xs text-muted-foreground">
              <strong>Your Address:</strong>
              <code className="block mt-1 break-all bg-muted p-1 rounded">{address}</code>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
