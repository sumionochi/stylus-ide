// deployment.ts
import { spawn } from "child_process";
import { COMPILATION_CONSTANTS } from "./constants";
import type { CompilationOutput } from "./compilation";

export interface DeploymentResult {
  success: boolean;
  contractAddress?: string;
  deploymentTxHash?: string;
  activationTxHash?: string;
  rpcUsed?: string;
  error?: string;
  output: CompilationOutput[];
}

function stripAnsi(input: string) {
  return input.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

function extractDeployInfo(allText: string) {
  const text = stripAnsi(allText);

  const addr =
    text.match(/deployed code at address:\s*(0x[a-fA-F0-9]{40})/i)?.[1] ??
    text.match(/contract address:\s*(0x[a-fA-F0-9]{40})/i)?.[1] ??
    text.match(/activated at address:\s*(0x[a-fA-F0-9]{40})/i)?.[1];

  const deploymentTx =
    text.match(/deployment tx hash:\s*(0x[a-fA-F0-9]{64})/i)?.[1] ??
    text.match(/deployment transaction hash:\s*(0x[a-fA-F0-9]{64})/i)?.[1];

  const activationTx =
    text.match(/contract activated.*tx hash:\s*(0x[a-fA-F0-9]{64})/i)?.[1] ??
    text.match(/wasm already activated.*(0x[a-fA-F0-9]{64})/i)?.[1];

  // fallback: first 64-byte hash we can find
  const anyHash = text.match(/0x[a-fA-F0-9]{64}/)?.[0];

  return {
    contractAddress: addr,
    deploymentTxHash: deploymentTx ?? anyHash,
    activationTxHash: activationTx,
  };
}

export async function deployContract(
  projectPath: string,
  privateKey: string,
  rpcUrl: string,
  onOutput?: (output: CompilationOutput) => void
): Promise<DeploymentResult> {
  return new Promise((resolve) => {
    const output: CompilationOutput[] = [];
    const startTime = Date.now();

    let stdoutBuf = "";
    let stderrBuf = "";

    const args = [
      "stylus",
      "deploy",
      "--private-key",
      privateKey,
      "--endpoint",
      rpcUrl,
      "--no-verify",
      "--max-fee-per-gas-gwei",
      "0.5",
    ];

    const proc = spawn("cargo", args, {
      cwd: projectPath,
      shell: false,
      env: {
        ...process.env,
        // ✅ critical: makes parsing stable
        CARGO_TERM_COLOR: "never",
        RUST_LOG: "info",
      },
    });

    const timeout = setTimeout(() => {
      proc.kill();
      const msg: CompilationOutput = {
        type: "error",
        data: "Deployment timed out after 3 minutes",
        timestamp: Date.now() - startTime,
      };
      output.push(msg);
      onOutput?.(msg);
      resolve({
        success: false,
        error: "Deployment timeout",
        output,
        rpcUsed: rpcUrl,
      });
    }, COMPILATION_CONSTANTS.PROCESS_TIMEOUT);

    proc.stdout.on("data", (data) => {
      const text = data.toString();
      stdoutBuf += text;

      const msg: CompilationOutput = {
        type: "stdout",
        data: text,
        timestamp: Date.now() - startTime,
      };
      output.push(msg);
      onOutput?.(msg);
    });

    proc.stderr.on("data", (data) => {
      const text = data.toString();
      stderrBuf += text;

      const msg: CompilationOutput = {
        type: "stderr",
        data: text,
        timestamp: Date.now() - startTime,
      };
      output.push(msg);
      onOutput?.(msg);
    });

    proc.on("error", (error) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        error: error.message,
        output,
        rpcUsed: rpcUrl,
      });
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);

      const combined = stdoutBuf + "\n" + stderrBuf;
      const { contractAddress, deploymentTxHash, activationTxHash } =
        extractDeployInfo(combined);

      if (code === 0 && contractAddress) {
        resolve({
          success: true,
          contractAddress,
          deploymentTxHash,
          activationTxHash,
          output,
          rpcUsed: rpcUrl,
        });
        return;
      }

      // ✅ handle "success but nonzero exit" (rare) if address exists
      if (contractAddress) {
        resolve({
          success: true,
          contractAddress,
          deploymentTxHash,
          activationTxHash,
          output,
          rpcUsed: rpcUrl,
          error: `Non-zero exit code ${code}, but contract address was found.`,
        });
        return;
      }

      resolve({
        success: false,
        error: stripAnsi(stderrBuf || "Deployment failed"),
        output,
        rpcUsed: rpcUrl,
      });
    });
  });
}
