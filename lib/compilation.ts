//compilation.ts
import { spawn } from "child_process";
import { COMPILATION_CONSTANTS, ERROR_MESSAGES } from "./constants";
import { createProjectStructure, writeProjectFiles } from "./file-utils";
import {
  CARGO_TOML_TEMPLATE,
  RUST_TOOLCHAIN_TOML,
  MAIN_RS_TEMPLATE,
  GITIGNORE_TEMPLATE,
} from "./cargo-template";

export interface CompilationOutput {
  type: "stdout" | "stderr" | "error" | "complete";
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

// Install WASM target for the Rust version in rust-toolchain.toml
async function installWasmTarget(projectPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("rustup", ["target", "add", "wasm32-unknown-unknown"], {
      cwd: projectPath,
      shell: false,
      env: process.env,
    });

    proc.on("close", (code) => {
      resolve(code === 0);
    });

    proc.on("error", () => {
      resolve(false);
    });
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

    proc.on("close", (code) => {
      resolve(code === 0);
    });

    proc.on("error", () => {
      resolve(false);
    });
  });
}

export async function runCargoStylusCheck(
  projectPath: string,
  code: string,
  onOutput?: (output: CompilationOutput) => void
): Promise<CompilationResult> {
  try {
    // STEP 1: Create project structure manually
    const { srcPath } = await createProjectStructure(projectPath);

    // STEP 2: Write all project files with exact SDK 0.6.0 versions
    await writeProjectFiles(
      projectPath,
      srcPath,
      code,
      CARGO_TOML_TEMPLATE,
      RUST_TOOLCHAIN_TOML,
      MAIN_RS_TEMPLATE,
      GITIGNORE_TEMPLATE
    );

    // STEP 3: Install WASM target for Rust 1.81
    const wasmInstalled = await installWasmTarget(projectPath);
    if (!wasmInstalled) {
      return {
        success: false,
        exitCode: -1,
        output: [
          {
            type: "error",
            data: "Failed to install wasm32-unknown-unknown target",
          },
        ],
        error: "Failed to install wasm32-unknown-unknown target",
      };
    }

    // STEP 4: Generate Cargo.lock
    const lockfileGenerated = await generateLockfile(projectPath);
    if (!lockfileGenerated) {
      return {
        success: false,
        exitCode: -1,
        output: [
          {
            type: "error",
            data: "Failed to generate Cargo.lock file",
          },
        ],
        error: "Failed to generate Cargo.lock file",
      };
    }

    // STEP 5: Run cargo stylus check
    return new Promise((resolve) => {
      const output: CompilationOutput[] = [];
      const startTime = Date.now();

      const proc = spawn("cargo", COMPILATION_CONSTANTS.COMMANDS.CHECK, {
        cwd: projectPath,
        shell: false,
        env: {
          ...process.env,
          CARGO_TERM_COLOR: "always",
          CARGO_TARGET_DIR: `${projectPath}/target`,
        },
      });

      const timeout = setTimeout(() => {
        proc.kill("SIGTERM");
        const timeoutOutput: CompilationOutput = {
          type: "error",
          data: ERROR_MESSAGES.TIMEOUT,
          timestamp: Date.now() - startTime,
        };
        output.push(timeoutOutput);
        onOutput?.(timeoutOutput);

        resolve({
          success: false,
          exitCode: -1,
          output,
          error: ERROR_MESSAGES.TIMEOUT,
        });
      }, COMPILATION_CONSTANTS.COMPILE_TIMEOUT);

      proc.stdout.on("data", (data) => {
        const outputItem: CompilationOutput = {
          type: "stdout",
          data: data.toString(),
          timestamp: Date.now() - startTime,
        };
        output.push(outputItem);
        onOutput?.(outputItem);
      });

      proc.stderr.on("data", (data) => {
        const outputItem: CompilationOutput = {
          type: "stderr",
          data: data.toString(),
          timestamp: Date.now() - startTime,
        };
        output.push(outputItem);
        onOutput?.(outputItem);
      });

      proc.on("error", (error) => {
        clearTimeout(timeout);
        const errorOutput: CompilationOutput = {
          type: "error",
          data: error.message,
          timestamp: Date.now() - startTime,
        };
        output.push(errorOutput);
        onOutput?.(errorOutput);

        resolve({
          success: false,
          exitCode: -1,
          output,
          error: error.message,
        });
      });

      proc.on("close", (code) => {
        clearTimeout(timeout);
        const completeOutput: CompilationOutput = {
          type: "complete",
          data: code === 0 ? "Compilation successful" : "Compilation failed",
          timestamp: Date.now() - startTime,
        };
        output.push(completeOutput);
        onOutput?.(completeOutput);

        resolve({
          success: code === 0,
          exitCode: code ?? -1,
          output,
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

  const errorRegex =
    /error(?:\[E\d+\])?: (.+)\n\s+-->\s+src\/lib\.rs:(\d+):(\d+)/g;

  let match;
  while ((match = errorRegex.exec(stderr)) !== null) {
    errors.push({
      message: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
    });
  }

  return errors;
}
