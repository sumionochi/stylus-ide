//compile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cleanupProject, getProjectPath } from "@/lib/file-utils";
import { runCargoStylusCheck, parseCompilationErrors } from "@/lib/compilation";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const sessionId = randomUUID();
  let projectPath = "";

  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    projectPath = getProjectPath(sessionId);

    // Run compilation (creates project via cargo stylus new + compiles)
    const result = await runCargoStylusCheck(projectPath, code);

    // Parse errors if compilation failed
    let parsedErrors: any[] = [];
    if (!result.success && result.output.length > 0) {
      const stderrContent = result.output
        .filter((o) => o.type === "stderr")
        .map((o) => o.data)
        .join("\n");

      parsedErrors = parseCompilationErrors(stderrContent);
    }

    // Cleanup
    await cleanupProject(sessionId);

    return NextResponse.json({
      success: result.success,
      exitCode: result.exitCode,
      output: result.output,
      errors: parsedErrors,
      sessionId,
    });
  } catch (error) {
    if (projectPath) {
      await cleanupProject(sessionId);
    }

    console.error("Compilation error:", error);
    return NextResponse.json(
      {
        error: "Compilation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
