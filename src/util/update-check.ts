import * as fs from "node:fs";
import * as path from "node:path";
import { VERSION } from "../constants.js";
import { getConfigDir, ensureConfigDir } from "../config/paths.js";

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LAST_CHECK_FILE = "last-update-check";

function compareVersions(current: string, latest: string): boolean {
  const cur = current.split(".").map(Number);
  const lat = latest.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((lat[i] ?? 0) > (cur[i] ?? 0)) return true;
    if ((lat[i] ?? 0) < (cur[i] ?? 0)) return false;
  }
  return false;
}

function getLastCheckPath(): string {
  return path.join(getConfigDir(), LAST_CHECK_FILE);
}

function shouldCheck(): boolean {
  try {
    const lastCheckPath = getLastCheckPath();
    const stat = fs.statSync(lastCheckPath);
    const elapsed = Date.now() - stat.mtimeMs;
    return elapsed > CHECK_INTERVAL_MS;
  } catch {
    return true; // file doesn't exist, should check
  }
}

function recordCheck(): void {
  try {
    ensureConfigDir();
    fs.writeFileSync(getLastCheckPath(), String(Date.now()));
  } catch {
    // ignore
  }
}

export async function checkForUpdate(): Promise<void> {
  try {
    // Only run when stdout is a TTY
    if (!process.stdout.isTTY) return;

    // Skip if checked recently
    if (!shouldCheck()) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    let response: Response;
    try {
      response = await fetch(
        "https://registry.npmjs.org/@hopkin/cli/latest",
        { signal: controller.signal },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) return;

    const data = (await response.json()) as { version?: string };
    const latestVersion = data.version;
    if (!latestVersion) return;

    recordCheck();

    if (compareVersions(VERSION, latestVersion)) {
      process.stderr.write(
        `Update available: ${VERSION} \u2192 ${latestVersion}. Run \`npm update -g @hopkin/cli\` to update.\n`,
      );
    }
  } catch {
    // Never throw - this is background, non-critical
  }
}
