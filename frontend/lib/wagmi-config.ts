import { http, createConfig } from "wagmi";
import { arbitrum, arbitrumSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { xaiSepolia, rariTestnet, sankoTestnet } from "./orbit-chains";

export const config = createConfig({
  chains: [arbitrumSepolia, arbitrum, xaiSepolia, rariTestnet, sankoTestnet],
  connectors: [
    injected(), // MetaMask, Rabby, Rainbow, Coinbase Wallet, etc.
  ],
  transports: {
    [arbitrumSepolia.id]: http(),
    [arbitrum.id]: http(),
    [xaiSepolia.id]: http(),
    [rariTestnet.id]: http(),
    [sankoTestnet.id]: http(),
  },
});
