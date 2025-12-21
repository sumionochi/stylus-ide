//deploy/route.ts <- api
import { NextRequest, NextResponse } from "next/server";
import { getProjectPath, projectExists } from "@/lib/file-utils";
import { deployContract } from "@/lib/deployment";

export const runtime = "nodejs";
export const maxDuration = 180;

// Normalize and validate private key format
function normalizePrivateKey(key: string): {
  normalized: string;
  error?: string;
} {
  // Remove whitespace and newlines
  let normalized = key.trim().replace(/\s/g, "");

  // Remove 0x prefix if present for validation
  const withoutPrefix =
    normalized.startsWith("0x") || normalized.startsWith("0X")
      ? normalized.slice(2)
      : normalized;

  // Validate it's valid hex
  if (!/^[a-fA-F0-9]+$/.test(withoutPrefix)) {
    return {
      normalized: "",
      error:
        "Private key contains invalid characters. Must be hexadecimal (0-9, a-f).",
    };
  }

  // Validate correct length (64 hex chars = 32 bytes)
  if (withoutPrefix.length !== 64) {
    return {
      normalized: "",
      error: `Private key must be exactly 64 hex characters (got ${withoutPrefix.length}). This causes the "Odd number of digits" error.`,
    };
  }

  // Always return with 0x prefix (required by cargo-stylus)
  return { normalized: `0x${withoutPrefix}` };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, privateKey, rpcUrl } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (!privateKey || typeof privateKey !== "string") {
      return NextResponse.json(
        { error: "Private key is required" },
        { status: 400 }
      );
    }

    if (!rpcUrl || typeof rpcUrl !== "string") {
      return NextResponse.json(
        { error: "RPC URL is required" },
        { status: 400 }
      );
    }

    // Normalize and validate private key
    const { normalized: normalizedKey, error: keyError } =
      normalizePrivateKey(privateKey);
    if (keyError) {
      return NextResponse.json(
        { error: keyError, success: false },
        { status: 400 }
      );
    }

    const projectPath = getProjectPath(sessionId);

    // Check if project exists
    const exists = await projectExists(sessionId);
    if (!exists) {
      return NextResponse.json(
        {
          error: "Project not found. Please compile your contract first.",
          success: false,
        },
        { status: 404 }
      );
    }

    // Use normalized key for deployment
    const result = await deployContract(projectPath, normalizedKey, rpcUrl);

    return NextResponse.json({
      success: result.success,
      contractAddress: result.contractAddress,
      txHash: result.activationTxHash ?? result.deploymentTxHash,
      deploymentTxHash: result.deploymentTxHash,
      activationTxHash: result.activationTxHash,
      rpcUsed: result.rpcUsed,
      error: result.error,
      output: result.output,
    });
  } catch (error) {
    console.error("Deployment error:", error);
    return NextResponse.json(
      {
        error: "Deployment failed",
        details: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 }
    );
  }
}
