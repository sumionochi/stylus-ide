//compilations.ts
import { spawn } from "child_process";
import { COMPILATION_CONSTANTS, ERROR_MESSAGES } from "./constants";
import { createProjectStructure, writeProjectFiles } from "./file-utils";
import {
  CARGO_TOML_TEMPLATE,
  RUST_TOOLCHAIN_TOML,
  MAIN_RS_TEMPLATE,
  GITIGNORE_TEMPLATE,
} from "./cargo-template";
import path from "path";
import fs from "fs/promises";

export interface CompilationOutput {
  type: "stdout" | "stderr" | "error" | "complete" | "result";
  data: string;
  timestamp?: number;
}

export interface CompilationResult {
  success: boolean;
  exitCode: number;
  output: CompilationOutput[];
  wasmSize?: number;
  error?: string;
}

function stripAnsi(input: string) {
  return input.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

// Install WASM target for the pinned toolchain
async function installWasmTarget(projectPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [
      "target",
      "add",
      "wasm32-unknown-unknown",
      "--toolchain",
      COMPILATION_CONSTANTS.RUST_TOOLCHAIN_CHANNEL,
    ];

    const proc = spawn("rustup", args, {
      cwd: projectPath,
      shell: false,
      env: process.env,
    });

    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
}

// Generate Cargo.lock file
async function generateLockfile(projectPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("cargo", ["generate-lockfile"], {
      cwd: projectPath,
      shell: false,
      env: process.env,
    });

    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
}

// Get WASM file size
async function getWasmSize(projectPath: string): Promise<number | null> {
  try {
    const wasmPath = path.join(
      projectPath,
      "target",
      "wasm32-unknown-unknown",
      "release",
      "stylus_hello_world.wasm"
    );
    const stats = await fs.stat(wasmPath);
    return stats.size;
  } catch {
    return null;
  }
}

export async function runCargoStylusCheck(
  projectPath: string,
  code: string,
  onOutput?: (output: CompilationOutput) => void
): Promise<CompilationResult> {
  try {
    // STEP 1: Create project structure
    const { srcPath } = await createProjectStructure(projectPath);

    // STEP 2: Write project files (Cargo.toml + rust-toolchain.toml + src/lib.rs + src/main.rs)
    await writeProjectFiles(
      projectPath,
      srcPath,
      code,
      CARGO_TOML_TEMPLATE,
      RUST_TOOLCHAIN_TOML,
      MAIN_RS_TEMPLATE,
      GITIGNORE_TEMPLATE
    );

    // STEP 3: Ensure wasm target exists for the pinned toolchain
    const wasmInstalled = await installWasmTarget(projectPath);
    if (!wasmInstalled) {
      return {
        success: false,
        exitCode: -1,
        output: [{ type: "error", data: ERROR_MESSAGES.WASM_TARGET_MISSING }],
        error: ERROR_MESSAGES.WASM_TARGET_MISSING,
      };
    }

    // STEP 4: Generate Cargo.lock (helps reproducibility)
    const lockfileGenerated = await generateLockfile(projectPath);
    if (!lockfileGenerated) {
      return {
        success: false,
        exitCode: -1,
        output: [{ type: "error", data: "Failed to generate Cargo.lock file" }],
        error: "Failed to generate Cargo.lock file",
      };
    }

    // STEP 5: Run cargo build (LOCAL COMPILATION - NO RPC NEEDED)
    return await new Promise((resolve) => {
      const output: CompilationOutput[] = [];
      const startTime = Date.now();

      const proc = spawn("cargo", COMPILATION_CONSTANTS.COMMANDS.BUILD, {
        cwd: projectPath,
        shell: false,
        env: {
          ...process.env,
          CARGO_TERM_COLOR: "always",
          CARGO_TARGET_DIR: `${projectPath}/target`,
        },
      });

      const timeout = setTimeout(() => {
        proc.kill();
        const msg: CompilationOutput = {
          type: "error",
          data: ERROR_MESSAGES.TIMEOUT,
          timestamp: Date.now() - startTime,
        };
        output.push(msg);
        onOutput?.(msg);

        resolve({
          success: false,
          exitCode: -1,
          output,
          error: ERROR_MESSAGES.TIMEOUT,
        });
      }, COMPILATION_CONSTANTS.COMPILE_TIMEOUT);

      proc.stdout.on("data", (data) => {
        const msg: CompilationOutput = {
          type: "stdout",
          data: data.toString(),
          timestamp: Date.now() - startTime,
        };
        output.push(msg);
        onOutput?.(msg);
      });

      proc.stderr.on("data", (data) => {
        const msg: CompilationOutput = {
          type: "stderr",
          data: data.toString(),
          timestamp: Date.now() - startTime,
        };
        output.push(msg);
        onOutput?.(msg);
      });

      proc.on("error", (error) => {
        clearTimeout(timeout);
        const msg: CompilationOutput = {
          type: "error",
          data: error.message,
          timestamp: Date.now() - startTime,
        };
        output.push(msg);
        onOutput?.(msg);

        resolve({
          success: false,
          exitCode: -1,
          output,
          error: error.message,
        });
      });

      proc.on("close", async (code) => {
        clearTimeout(timeout);

        // Get WASM size if compilation succeeded
        let wasmSize: number | undefined;
        if (code === 0) {
          const size = await getWasmSize(projectPath);
          if (size !== null) {
            wasmSize = size;
            const sizeMB = (size / 1024).toFixed(2);
            const maxMB = (COMPILATION_CONSTANTS.MAX_WASM_SIZE / 1024).toFixed(
              2
            );

            // Add size info to output
            const sizeMsg: CompilationOutput = {
              type:
                size > COMPILATION_CONSTANTS.MAX_WASM_SIZE ? "error" : "stdout",
              data:
                size > COMPILATION_CONSTANTS.MAX_WASM_SIZE
                  ? `⚠️  WASM size: ${sizeMB} KB (exceeds ${maxMB} KB limit)`
                  : `✓ WASM size: ${sizeMB} KB (within ${maxMB} KB limit)`,
              timestamp: Date.now() - startTime,
            };
            output.push(sizeMsg);
            onOutput?.(sizeMsg);
          }
        }

        const msg: CompilationOutput = {
          type: "complete",
          data:
            code === 0 ? "✓ Compilation successful" : "✗ Compilation failed",
          timestamp: Date.now() - startTime,
        };
        output.push(msg);
        onOutput?.(msg);

        resolve({
          success: code === 0,
          exitCode: code ?? -1,
          output,
          wasmSize,
        });
      });
    });
  } catch (error) {
    return {
      success: false,
      exitCode: -1,
      output: [
        {
          type: "error",
          data: error instanceof Error ? error.message : "Unknown error",
        },
      ],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function parseCompilationErrors(stderr: string): {
  line: number;
  column: number;
  message: string;
}[] {
  const errors: { line: number; column: number; message: string }[] = [];
  const clean = stripAnsi(stderr);

  // Matches:
  // error[E0412]: message...
  //   --> src/lib.rs:16:31
  const re =
    /error(?:\[[A-Z0-9]+\])?:\s+(.+?)\n(?:.|\n)*?-->\s+src[\\/]+lib\.rs:(\d+):(\d+)/g;

  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    errors.push({
      message: m[1].trim(),
      line: parseInt(m[2], 10),
      column: parseInt(m[3], 10),
    });
  }

  return errors;
}

export interface CompilationOutput {
  type: "stdout" | "stderr" | "error" | "complete" | "result";
  data: string;
  timestamp?: number;
}

type RunResult = {
  code: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

function extractFromFirstInterface(text: string): string | null {
  const idx = text.indexOf("interface ");
  if (idx === -1) return null;
  return text.slice(idx).trim();
}

function extractJsonArray(text: string): string | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function runCargo(
  cwd: string,
  args: string[],
  timeoutMs: number,
  onOutput?: (o: CompilationOutput) => void
): Promise<RunResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const proc = spawn("cargo", args, {
      cwd,
      shell: false,
      env: {
        ...process.env,
        // ✅ don't pollute parsing with colors
        CARGO_TERM_COLOR: "never",
      },
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      try {
        proc.kill("SIGKILL");
      } catch {}
    }, timeoutMs);

    proc.stdout.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      onOutput?.({ type: "stdout", data: s, timestamp: Date.now() - start });
    });

    proc.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      onOutput?.({ type: "stderr", data: s, timestamp: Date.now() - start });
    });

    proc.on("error", (e) => {
      clearTimeout(timeout);
      resolve({
        code: -1,
        stdout,
        stderr: stderr + `\n${e.message}`,
        timedOut,
      });
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ code: code ?? -1, stdout, stderr, timedOut });
    });
  });
}

export async function exportContractABI(
  projectPath: string,
  onOutput?: (output: CompilationOutput) => void
): Promise<{
  success: boolean;
  solidity?: string;
  abi?: string; // ✅ JSON ABI (prettified)
  error?: string;
  details?: string;
}> {
  // Keep under your Next route maxDuration=60s
  const timeoutMs = Math.min(COMPILATION_CONSTANTS.COMPILE_TIMEOUT, 55_000);

  // 1) Solidity interface
  const solRes = await runCargo(
    projectPath,
    ["stylus", "export-abi", "--rust-features=export-abi"],
    timeoutMs,
    onOutput
  );

  const combinedSol = `${solRes.stdout}\n${solRes.stderr}`;
  const solidity =
    extractFromFirstInterface(solRes.stdout) ||
    extractFromFirstInterface(solRes.stderr) ||
    extractFromFirstInterface(combinedSol);

  if (solRes.timedOut) {
    return {
      success: false,
      error: "ABI export timed out",
      details: `Timed out after ${timeoutMs}ms\nSTDERR:\n${solRes.stderr}\nSTDOUT:\n${solRes.stdout}`,
    };
  }

  if (solRes.code !== 0 || !solidity) {
    return {
      success: false,
      error: "Failed to export Solidity interface",
      details: `exit=${solRes.code}\nSTDERR:\n${solRes.stderr}\nSTDOUT:\n${solRes.stdout}`,
    };
  }

  // 2) JSON ABI (optional; may require solc)
  const jsonRes = await runCargo(
    projectPath,
    ["stylus", "export-abi", "--json", "--rust-features=export-abi"],
    timeoutMs,
    onOutput
  );

  let abi: string | undefined;

  if (jsonRes.code === 0) {
    const mixed = `${jsonRes.stdout}\n${jsonRes.stderr}`;
    const jsonPart =
      extractJsonArray(jsonRes.stdout) ||
      extractJsonArray(jsonRes.stderr) ||
      extractJsonArray(mixed);

    if (jsonPart) {
      try {
        abi = JSON.stringify(JSON.parse(jsonPart), null, 2);
      } catch {
        // ignore parse failures; still return solidity
      }
    }
  }

  return {
    success: true,
    solidity,
    abi,
  };
}
