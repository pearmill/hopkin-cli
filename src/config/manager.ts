import * as fs from "node:fs";
import * as path from "node:path";
import type { HopkinConfig } from "../types.js";
import { CONFIG_FILE } from "../constants.js";
import { getConfigDir, ensureConfigDir } from "./paths.js";

function resolveConfigPath(configDir?: string): string {
  const dir = configDir ?? getConfigDir();
  return path.join(dir, CONFIG_FILE);
}

function ensureDir(configDir?: string): void {
  const dir = configDir ?? getConfigDir();
  fs.mkdirSync(dir, { recursive: true });
}

export function readConfig(configDir?: string): HopkinConfig {
  const configPath = resolveConfigPath(configDir);
  if (!fs.existsSync(configPath)) {
    return {};
  }
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as HopkinConfig;
}

export function writeConfig(config: HopkinConfig, configDir?: string): void {
  ensureDir(configDir);
  const configPath = resolveConfigPath(configDir);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

export function getConfigValue(keyPath: string, configDir?: string): unknown {
  const config = readConfig(configDir);
  const keys = keyPath.split(".");
  let current: unknown = config;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function setConfigValue(keyPath: string, value: unknown, configDir?: string): void {
  const config = readConfig(configDir);
  const keys = keyPath.split(".");
  let current: Record<string, unknown> = config;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
  writeConfig(config, configDir);
}

export function unsetConfigValue(keyPath: string, configDir?: string): void {
  const config = readConfig(configDir);
  const keys = keyPath.split(".");
  let current: Record<string, unknown> = config;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || typeof current[key] !== "object" || current[key] === null) {
      return;
    }
    current = current[key] as Record<string, unknown>;
  }
  delete current[keys[keys.length - 1]];
  writeConfig(config, configDir);
}
