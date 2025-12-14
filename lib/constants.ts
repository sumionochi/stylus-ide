export const COMPILATION_CONSTANTS = {
  COMMANDS: {
    BUILD: ["build", "--target", "wasm32-unknown-unknown", "--release"], // Local WASM compilation
    CHECK: ["stylus", "check", "--endpoint"], // For Phase 2 (will add RPC URL)
    EXPORT_ABI: ["stylus", "export-abi", "--json"],
  },

  // Keep in sync with rust-toolchain.toml template
  RUST_TOOLCHAIN_CHANNEL: "1.87.0",

  TEMP_BASE: ".stylus-temp",
  COMPILE_TIMEOUT: 120000,
  PROCESS_TIMEOUT: 180000,

  // Stylus WASM size limit (24KB)
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
