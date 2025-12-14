//compile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cleanupProject, getProjectPath } from "@/lib/file-utils";
import { runCargoStylusCheck, parseCompilationErrors } from "@/lib/compilation";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const sessionId = randomUUID();
  const projectPath = getProjectPath(sessionId);

  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const result = await runCargoStylusCheck(projectPath, code);

    // Parse errors from stderr
    const stderrContent = result.output
      .filter((o) => o.type === "stderr")
      .map((o) => o.data)
      .join("\n");

    const parsedErrors =
      !result.success && stderrContent.length > 0
        ? parseCompilationErrors(stderrContent)
        : [];

    return NextResponse.json({
      success: result.success,
      exitCode: result.exitCode,
      output: result.output,
      errors: parsedErrors,
      sessionId,
    });
  } catch (error) {
    console.error("Compilation error:", error);
    return NextResponse.json(
      {
        error: "Compilation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    await cleanupProject(sessionId);
  }
}
