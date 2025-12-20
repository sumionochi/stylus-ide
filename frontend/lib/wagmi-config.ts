import { http, createConfig } from "wagmi";
import { arbitrum, arbitrumSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { xaiSepolia, apechainCurtis, nitrogenTestnet } from "./orbit-chains";

export const config = createConfig({
  chains: [
    arbitrumSepolia,
    arbitrum,
    xaiSepolia,
    apechainCurtis,
    nitrogenTestnet,
  ],
  connectors: [
    injected(), // MetaMask, Rabby, Rainbow, Coinbase Wallet, etc.
  ],
  transports: {
    [arbitrumSepolia.id]: http(),
    [arbitrum.id]: http(),
    [xaiSepolia.id]: http(),
    [apechainCurtis.id]: http(),
    [nitrogenTestnet.id]: http(),
  },
});
