import * as fs from "node:fs";
import * as path from "node:path";
import type { AuthCredentials } from "../types.js";
import { CREDENTIALS_FILE } from "../constants.js";
import { getConfigDir } from "../config/paths.js";

function resolveCredentialsPath(configDir?: string): string {
  const dir = configDir ?? getConfigDir();
  return path.join(dir, CREDENTIALS_FILE);
}

function ensureDir(configDir?: string): void {
  const dir = configDir ?? getConfigDir();
  fs.mkdirSync(dir, { recursive: true });
}

export function readCredentials(configDir?: string): AuthCredentials {
  const credPath = resolveCredentialsPath(configDir);
  if (!fs.existsSync(credPath)) {
    return {};
  }
  const raw = fs.readFileSync(credPath, "utf-8");
  return JSON.parse(raw) as AuthCredentials;
}

export function writeCredentials(credentials: AuthCredentials, configDir?: string): void {
  ensureDir(configDir);
  const credPath = resolveCredentialsPath(configDir);
  fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2), { mode: 0o600 });
}

export function clearCredentials(configDir?: string): void {
  const credPath = resolveCredentialsPath(configDir);
  if (fs.existsSync(credPath)) {
    fs.unlinkSync(credPath);
  }
}

export function hasCredentials(configDir?: string): boolean {
  const credPath = resolveCredentialsPath(configDir);
  if (!fs.existsSync(credPath)) {
    return false;
  }
  const creds = readCredentials(configDir);
  return !!(creds.api_key || creds.oauth);
}
