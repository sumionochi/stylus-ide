import { NextRequest, NextResponse } from "next/server";
import { getProjectPath, projectExists } from "@/lib/file-utils";
import { deployContract } from "@/lib/deployment";

export const runtime = "nodejs";
export const maxDuration = 180;

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

    const result = await deployContract(projectPath, privateKey, rpcUrl);

    // deploy/route.ts
    return NextResponse.json({
      success: result.success,
      contractAddress: result.contractAddress,

      // keep old UI compatibility:
      txHash: result.activationTxHash ?? result.deploymentTxHash,

      // expose both (better UX):
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
