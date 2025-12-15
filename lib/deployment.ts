import { spawn } from "child_process";
import { COMPILATION_CONSTANTS } from "./constants";
import { CompilationOutput } from "./compilation";

export interface DeploymentResult {
  success: boolean;
  contractAddress?: string;
  txHash?: string;
  error?: string;
  output: CompilationOutput[];
}

export async function deployContract(
  projectPath: string,
  privateKey: string,
  rpcUrl: string,
  onOutput?: (output: CompilationOutput) => void
): Promise<DeploymentResult> {
  return new Promise((resolve) => {
    const output: CompilationOutput[] = [];
    let contractAddress = "";
    let txHash = "";
    let errorDetails = "";
    const startTime = Date.now();

    console.log("Deploying contract...");
    console.log("RPC:", rpcUrl);
    console.log("Project path:", projectPath);

    const args = [
      "stylus",
      "deploy",
      "--private-key",
      privateKey,
      "--endpoint",
      rpcUrl,
      "--no-verify", // Skip verification for now
    ];

    const proc = spawn("cargo", args, {
      cwd: projectPath,
      shell: false,
      env: {
        ...process.env,
        CARGO_TERM_COLOR: "always",
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
      });
    }, COMPILATION_CONSTANTS.PROCESS_TIMEOUT);

    proc.stdout.on("data", (data) => {
      const text = data.toString();
      console.log("STDOUT:", text);

      // Extract contract address
      const addressMatch = text.match(/deployed code at address ([0-9a-fx]+)/i);
      if (addressMatch) {
        contractAddress = addressMatch[1];
      }

      // Extract transaction hash
      const txMatch = text.match(/transaction hash ([0-9a-fx]+)/i);
      if (txMatch) {
        txHash = txMatch[1];
      }

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
      errorDetails += text;
      console.log("STDERR:", text);

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
      console.error("Process error:", error);

      const msg: CompilationOutput = {
        type: "error",
        data: error.message,
        timestamp: Date.now() - startTime,
      };
      output.push(msg);
      onOutput?.(msg);

      resolve({
        success: false,
        error: error.message,
        output,
      });
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      console.log("Deploy process exited with code:", code);

      if (code === 0 && contractAddress) {
        const msg: CompilationOutput = {
          type: "complete",
          data: `✓ Deployment successful!\nContract: ${contractAddress}${
            txHash ? `\nTx: ${txHash}` : ""
          }`,
          timestamp: Date.now() - startTime,
        };
        output.push(msg);
        onOutput?.(msg);

        resolve({
          success: true,
          contractAddress,
          txHash,
          output,
        });
      } else {
        const msg: CompilationOutput = {
          type: "error",
          data: "Deployment failed",
          timestamp: Date.now() - startTime,
        };
        output.push(msg);
        onOutput?.(msg);

        resolve({
          success: false,
          error: errorDetails || "Deployment failed",
          output,
        });
      }
    });
  });
}
