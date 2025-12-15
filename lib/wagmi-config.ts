import { http, createConfig } from "wagmi";
import { arbitrum, arbitrumSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

export const config = createConfig({
  chains: [arbitrumSepolia, arbitrum],
  connectors: [
    injected(), // MetaMask, Rabby, Rainbow, Coinbase Wallet, etc.
  ],
  transports: {
    [arbitrumSepolia.id]: http(),
    [arbitrum.id]: http(),
  },
});
