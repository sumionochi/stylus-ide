export const MNN_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "warmth", type: "uint256" },
      { internalType: "uint256", name: "intensity", type: "uint256" },
      { internalType: "uint256", name: "depth", type: "uint256" },
    ],
    name: "viewAesthetic",
    outputs: [
      { internalType: "uint8", name: "", type: "uint8" },
      { internalType: "uint8", name: "", type: "uint8" },
      { internalType: "uint8", name: "", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNetworkInfo",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getParameterCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const RAY_TRACING_ABI = [
  {
    inputs: [
      { internalType: "uint8", name: "sphere_r", type: "uint8" },
      { internalType: "uint8", name: "sphere_g", type: "uint8" },
      { internalType: "uint8", name: "sphere_b", type: "uint8" },
      { internalType: "uint8", name: "bg_color1_r", type: "uint8" },
      { internalType: "uint8", name: "bg_color1_g", type: "uint8" },
      { internalType: "uint8", name: "bg_color1_b", type: "uint8" },
      { internalType: "uint8", name: "bg_color2_r", type: "uint8" },
      { internalType: "uint8", name: "bg_color2_g", type: "uint8" },
      { internalType: "uint8", name: "bg_color2_b", type: "uint8" },
      { internalType: "int32", name: "cam_x", type: "int32" },
      { internalType: "int32", name: "cam_y", type: "int32" },
      { internalType: "int32", name: "cam_z", type: "int32" },
    ],
    name: "mint",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "token_id", type: "uint256" }],
    name: "renderToken",
    outputs: [{ internalType: "bytes", name: "", type: "bytes" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "token_id", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getResolution",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Convert raw pixel bytes to ImageData
 */
export function bytesToImageData(
  bytes: Uint8Array,
  width: number = 32,
  height: number = 32
): ImageData {
  if (bytes.length !== width * height * 3) {
    throw new Error(
      `Expected ${width * height * 3} bytes, got ${bytes.length}`
    );
  }

  const imageData = new ImageData(width, height);

  for (let i = 0; i < bytes.length; i += 3) {
    const pixelIndex = i / 3;
    const dataIndex = pixelIndex * 4;

    imageData.data[dataIndex] = bytes[i]; // R
    imageData.data[dataIndex + 1] = bytes[i + 1]; // G
    imageData.data[dataIndex + 2] = bytes[i + 2]; // B
    imageData.data[dataIndex + 3] = 255; // A (fully opaque)
  }

  return imageData;
}

/**
 * Convert ImageData to PNG blob
 */
export function imageDataToBlob(imageData: ImageData): Promise<Blob | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(null);
      return;
    }

    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob(resolve);
  });
}

/**
 * Scale up pixel art without blurring
 */
export function scalePixelArt(
  sourceCanvas: HTMLCanvasElement,
  scale: number = 8
): HTMLCanvasElement {
  const scaledCanvas = document.createElement("canvas");
  scaledCanvas.width = sourceCanvas.width * scale;
  scaledCanvas.height = sourceCanvas.height * scale;

  const ctx = scaledCanvas.getContext("2d");
  if (!ctx) return sourceCanvas;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sourceCanvas,
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
    0,
    0,
    scaledCanvas.width,
    scaledCanvas.height
  );

  return scaledCanvas;
}

/**
 * Parse hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  // Remove '0x' prefix if present
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;

  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }

  return bytes;
}

/**
 * Calculate gas cost estimate
 */
export function estimateRenderCost(gasUsed: bigint): {
  gasUsed: string;
  gasPriceGwei: number;
  costETH: string;
  costUSD: string;
} {
  const gasPriceGwei = 0.02; // Typical Arbitrum gas price
  const ethPrice = 2500; // Approximate ETH price

  const costETH = (Number(gasUsed) * gasPriceGwei) / 1e9;
  const costUSD = costETH * ethPrice;

  return {
    gasUsed: gasUsed.toString(),
    gasPriceGwei,
    costETH: costETH.toFixed(6),
    costUSD: costUSD.toFixed(4),
  };
}
