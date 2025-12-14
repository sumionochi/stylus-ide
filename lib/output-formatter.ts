/**
 * Strip ANSI color codes from terminal output
 */
export function stripAnsiCodes(text: string | undefined): string {
  if (!text) return "";
  return text.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

/**
 * Format compilation time in human-readable format
 */
export function formatCompilationTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = (ms / 1000).toFixed(2);
  return `${seconds}s`;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(2)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Detect output type and apply appropriate styling
 */
export function getOutputStyle(data: string | undefined): {
  isError: boolean;
  isWarning: boolean;
  isSuccess: boolean;
} {
  if (!data) return { isError: false, isWarning: false, isSuccess: false };

  const cleanData = stripAnsiCodes(data).toLowerCase();

  return {
    isError: cleanData.includes("error") || cleanData.includes("failed"),
    isWarning: cleanData.includes("warning"),
    isSuccess: cleanData.includes("finished") || cleanData.includes("✓"),
  };
}

/**
 * Extract meaningful lines from cargo output
 */
export function formatCargoOutput(output: string | undefined): string {
  if (!output) return "";

  const lines = output.split("\n");
  const filtered = lines.filter((line) => {
    const clean = stripAnsiCodes(line).trim();
    // Skip empty lines and build status lines
    if (!clean || (clean.startsWith("Compiling") && !clean.includes("("))) {
      return false;
    }
    return true;
  });

  return filtered.join("\n");
}
