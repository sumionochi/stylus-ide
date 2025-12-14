//constants.ts
export const COMPILATION_CONSTANTS = {
  COMMANDS: {
    CHECK: ["stylus", "check"],
    EXPORT_ABI: ["stylus", "export-abi", "--json"],
  },

  // SDK 0.6.0 with pinned alloy versions
  DEPENDENCIES: {
    "stylus-sdk": "0.6.0",
    "alloy-primitives": "=0.7.6",
    "alloy-sol-types": "=0.7.6",
    "mini-alloc": "0.4.2",
  },

  RUST_VERSION: "1.81",

  TEMP_BASE: ".stylus-temp",
  COMPILE_TIMEOUT: 120000,
  PROCESS_TIMEOUT: 180000,
};

export const ERROR_MESSAGES = {
  RUST_NOT_FOUND: "Rust is not installed. Run: npm run setup",
  CARGO_STYLUS_NOT_FOUND:
    "cargo-stylus not found. Run: cargo install cargo-stylus",
  COMPILATION_FAILED: "Compilation failed. Check output for details.",
  TIMEOUT: "Compilation timed out after 2 minutes.",
  WASM_TARGET_MISSING: "WASM target not installed for Rust toolchain",
};
