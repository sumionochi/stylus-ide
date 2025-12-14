//compile-stream/route.ts
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { cleanupProject, getProjectPath } from "@/lib/file-utils";
import {
  runCargoStylusCheck,
  CompilationOutput,
  parseCompilationErrors,
} from "@/lib/compilation";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const sessionId = randomUUID();
  const projectPath = getProjectPath(sessionId);

  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return new Response("Code is required", { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    (async () => {
      const stderrChunks: string[] = [];

      try {
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ type: "start", sessionId })}\n\n`
          )
        );

        const result = await runCargoStylusCheck(
          projectPath,
          code,
          async (out: CompilationOutput) => {
            if (out.type === "stderr") stderrChunks.push(out.data);
            await writer.write(
              encoder.encode(`data: ${JSON.stringify(out)}\n\n`)
            );
          }
        );

        const stderr = stderrChunks.join("\n");
        const errors =
          !result.success && stderr.length > 0
            ? parseCompilationErrors(stderr)
            : [];

        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "result",
              success: result.success,
              exitCode: result.exitCode,
              errors,
            })}\n\n`
          )
        );
      } catch (error) {
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              data: error instanceof Error ? error.message : "Unknown error",
            })}\n\n`
          )
        );
      } finally {
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
