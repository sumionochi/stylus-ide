import { NextRequest, NextResponse } from "next/server";
import { getProjectPath, projectExists } from "@/lib/file-utils";
import { exportContractABI } from "@/lib/compilation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "Session ID is required", success: false },
        { status: 400 }
      );
    }

    const exists = await projectExists(sessionId);
    if (!exists) {
      return NextResponse.json(
        {
          error: "Project not found. Please compile your contract again.",
          success: false,
        },
        { status: 404 }
      );
    }

    const projectPath = getProjectPath(sessionId);
    const result = await exportContractABI(projectPath);

    if (!result.success) {
      console.error("ABI Export Failed:");
      console.error("Error:", result.error);
      console.error("Details:", result.details);
    }

    return NextResponse.json({
      success: result.success,
      solidity: result.solidity,
      abi: result.abi, // ✅ JSON ABI if available
      error: result.error,
      details: result.details,
    });
  } catch (error) {
    console.error("ABI export error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "ABI export failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
