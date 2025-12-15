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

export async function cleanupOldProjects(maxAgeMinutes: number = 30) {
  const tempBase = path.join(process.cwd(), COMPILATION_CONSTANTS.TEMP_BASE);

  try {
    const entries = await fs.readdir(tempBase, { withFileTypes: true });
    const now = Date.now();
    const maxAgeMs = maxAgeMinutes * 60 * 1000;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(tempBase, entry.name);
        try {
          const stats = await fs.stat(projectPath);
          const age = now - stats.mtimeMs;

          if (age > maxAgeMs) {
            await fs.rm(projectPath, { recursive: true, force: true });
            console.log(`Cleaned up old project: ${entry.name}`);
          }
        } catch {
          // ignore per-project errors
        }
      }
    }
  } catch {
    // ignore if temp directory doesn't exist
  }
}

export function getProjectPath(sessionId: string): string {
  return path.join(process.cwd(), COMPILATION_CONSTANTS.TEMP_BASE, sessionId);
}

export async function projectExists(sessionId: string): Promise<boolean> {
  const projectPath = getProjectPath(sessionId);
  try {
    await fs.access(projectPath);
    return true;
  } catch {
    return false;
  }
}
