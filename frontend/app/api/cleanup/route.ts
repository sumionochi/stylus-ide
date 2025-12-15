import { NextRequest, NextResponse } from "next/server";
import { cleanupOldProjects } from "@/lib/file-utils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await cleanupOldProjects(30); // Cleanup projects older than 30 minutes
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
