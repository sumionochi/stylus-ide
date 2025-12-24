import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getProjectPath } from "@/lib/file-utils";
import {
  runCargoStylusCheck,
  parseCompilationErrors,
  ProjectFile, // Import the interface
} from "@/lib/compilation";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const sessionId = randomUUID();
  const projectPath = getProjectPath(sessionId);

  try {
    const body = await request.json();
    const { code, projectFiles } = body;

    // Validate input
    let filesToCompile: ProjectFile[] | undefined;
    let mainCode = code;

    if (
      projectFiles &&
      Array.isArray(projectFiles) &&
      projectFiles.length > 0
    ) {
      // Multi-file mode
      filesToCompile = projectFiles;

      // Find lib.rs for backward compatibility (used as fallback)
      const libFile = projectFiles.find(
        (f: ProjectFile) => f.path === "src/lib.rs" || f.path === "./src/lib.rs"
      );
      if (libFile) {
        mainCode = libFile.content;
      } else {
        // If no lib.rs, use first .rs file
        const firstRsFile = projectFiles.find((f: ProjectFile) =>
          f.path.endsWith(".rs")
        );
        if (firstRsFile) {
          mainCode = firstRsFile.content;
        }
      }
    } else if (!code || typeof code !== "string") {
      return NextResponse.json(
        {
          error: "Code or projectFiles required",
        },
        { status: 400 }
      );
    }

    // Run compilation with multi-file support
    // The runCargoStylusCheck function now handles ALL file writing internally
    const result = await runCargoStylusCheck(
      projectPath,
      mainCode,
      undefined, // onOutput callback (optional)
      filesToCompile // NEW: Pass project files (optional)
    );

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
      output: result.output, // Already includes file count from runCargoStylusCheck
      errors: parsedErrors,
      sessionId,
      wasmSize: result.wasmSize, // Include WASM size
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
  }
}
