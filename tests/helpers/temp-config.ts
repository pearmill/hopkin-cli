import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface TempConfigContext {
  dir: string;
  configPath: string;
  credentialsPath: string;
  cachePath: string;
  cleanup: () => void;
}

export function createTempConfig(): TempConfigContext {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hopkin-test-"));
  const configPath = path.join(dir, "config.json");
  const credentialsPath = path.join(dir, "credentials.json");
  const cachePath = path.join(dir, "tools-cache.json");

  return {
    dir,
    configPath,
    credentialsPath,
    cachePath,
    cleanup() {
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
