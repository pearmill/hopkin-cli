import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import {
  CONFIG_DIR_NAME,
  CONFIG_FILE,
  CREDENTIALS_FILE,
  CACHE_FILE,
} from "../constants.js";

export function getConfigDir(): string {
  if (process.env.HOPKIN_CONFIG_DIR) {
    return process.env.HOPKIN_CONFIG_DIR;
  }

  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  const base = xdgConfigHome ?? path.join(os.homedir(), ".config");
  return path.join(base, CONFIG_DIR_NAME);
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), CONFIG_FILE);
}

export function getCredentialsPath(): string {
  return path.join(getConfigDir(), CREDENTIALS_FILE);
}

export function getCachePath(): string {
  return path.join(getConfigDir(), CACHE_FILE);
}

export function ensureConfigDir(): void {
  fs.mkdirSync(getConfigDir(), { recursive: true });
}
