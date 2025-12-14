//compile-stream/route.ts
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { cleanupProject, getProjectPath } from "@/lib/file-utils";
import { runCargoStylusCheck, CompilationOutput } from "@/lib/compilation";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const sessionId = randomUUID();

  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return new Response("Code is required", { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const projectPath = getProjectPath(sessionId);

    // Start compilation in background
    (async () => {
      try {
        // Send initial message
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ type: "start", sessionId })}\n\n`
          )
        );

        // Run compilation with streaming output
        await runCargoStylusCheck(
          projectPath,
          code,
          async (output: CompilationOutput) => {
            await writer.write(
              encoder.encode(`data: ${JSON.stringify(output)}\n\n`)
            );
          }
        );

        // Cleanup
        await cleanupProject(sessionId);
        await writer.close();
      } catch (error) {
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              data: error instanceof Error ? error.message : "Unknown error",
            })}\n\n`
          )
        );
        await cleanupProject(sessionId);
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to start compilation",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
