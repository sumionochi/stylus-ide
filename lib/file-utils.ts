//file-utils.ts
import fs from "fs/promises";
import path from "path";
import { COMPILATION_CONSTANTS } from "./constants";

export async function createProjectStructure(projectPath: string) {
  const srcPath = path.join(projectPath, "src");
  await fs.mkdir(srcPath, { recursive: true });
  return { projectPath, srcPath };
}

export async function writeProjectFiles(
  projectPath: string,
  srcPath: string,
  code: string,
  cargoToml: string,
  rustToolchain: string,
  mainRs: string,
  gitignore: string
) {
  await Promise.all([
    fs.writeFile(path.join(projectPath, "Cargo.toml"), cargoToml),
    fs.writeFile(path.join(projectPath, "rust-toolchain.toml"), rustToolchain),
    fs.writeFile(path.join(srcPath, "lib.rs"), code),
    fs.writeFile(path.join(srcPath, "main.rs"), mainRs),
    fs.writeFile(path.join(projectPath, ".gitignore"), gitignore),
  ]);
}

export async function cleanupProject(sessionId: string) {
  const projectPath = path.join(
    process.cwd(),
    COMPILATION_CONSTANTS.TEMP_BASE,
    sessionId
  );
  try {
    await fs.rm(projectPath, { recursive: true, force: true });
  } catch (error) {
    console.error("Cleanup error:", error);
  }
}

export function getProjectPath(sessionId: string): string {
  return path.join(process.cwd(), COMPILATION_CONSTANTS.TEMP_BASE, sessionId);
}
