import { exec } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";

const execAsync = promisify(exec);

interface SetupStatus {
  rust: boolean;
  cargo: boolean;
  wasmTarget: boolean;
  cargoStylus: boolean;
  platform: "darwin" | "linux" | "win32" | "other";
  rustVersion?: string;
  needsUpdate?: boolean;
}

async function checkCommand(command: string): Promise<boolean> {
  try {
    await execAsync(command, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function getRustVersion(): Promise<{
  version: string;
  major: number;
  minor: number;
} | null> {
  try {
    const { stdout } = await execAsync("rustc --version", { timeout: 5000 });
    const match = stdout.match(/rustc (\d+)\.(\d+)\.(\d+)/);
    if (match) {
      return {
        version: `${match[1]}.${match[2]}.${match[3]}`,
        major: parseInt(match[1]),
        minor: parseInt(match[2]),
      };
    }
  } catch {}
  return null;
}

async function checkWasmTarget(): Promise<boolean> {
  try {
    const { stdout } = await execAsync("rustup target list", { timeout: 5000 });
    return stdout.includes("wasm32-unknown-unknown (installed)");
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const platform = process.platform as SetupStatus["platform"];

    const [rust, cargo, wasmTarget, cargoStylus] = await Promise.all([
      checkCommand("rustc --version"),
      checkCommand("cargo --version"),
      checkWasmTarget(),
      checkCommand("cargo stylus --version"),
    ]);

    const rustVersionInfo = await getRustVersion();
    const needsUpdate = rustVersionInfo
      ? rustVersionInfo.major < 1 ||
        (rustVersionInfo.major === 1 && rustVersionInfo.minor < 88)
      : false;

    const status: SetupStatus = {
      rust,
      cargo,
      wasmTarget,
      cargoStylus,
      platform: ["darwin", "linux", "win32"].includes(platform)
        ? (platform as "darwin" | "linux" | "win32")
        : "other",
      rustVersion: rustVersionInfo?.version,
      needsUpdate,
    };

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check setup",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
