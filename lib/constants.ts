export const COMPILATION_CONSTANTS = {
  COMMANDS: {
    BUILD: ["build", "--target", "wasm32-unknown-unknown", "--release"],
    CHECK: ["stylus", "check", "--endpoint"], // For Phase 2
    EXPORT_ABI: [
      "run",
      "--release",
      "--features",
      "export-abi",
      "--bin",
      "stylus-hello-world",
    ], // RUN the binary
  },

  RUST_TOOLCHAIN_CHANNEL: "1.87.0",
  TEMP_BASE: ".stylus-temp",
  COMPILE_TIMEOUT: 120000,
  PROCESS_TIMEOUT: 180000,
  MAX_WASM_SIZE: 24 * 1024,
};

export const ERROR_MESSAGES = {
  RUST_NOT_FOUND: "Rust is not installed. Run: npm run setup",
  CARGO_STYLUS_NOT_FOUND:
    "cargo-stylus not found. Run: cargo install cargo-stylus",
  COMPILATION_FAILED: "Compilation failed. Check output for details.",
  TIMEOUT: "Compilation timed out after 2 minutes.",
  WASM_TARGET_MISSING: "WASM target not installed for Rust toolchain",
  WASM_TOO_LARGE:
    "WASM binary exceeds 24KB size limit. Try optimizing with opt-level = 's' or 'z'",
};
