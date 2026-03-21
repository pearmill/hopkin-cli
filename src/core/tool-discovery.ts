import * as fs from "node:fs";
import * as path from "node:path";
import { CACHE_FILE, CACHE_TTL_MS } from "../constants.js";
import { getConfigDir } from "../config/paths.js";
import { getServers } from "../config/servers.js";
import { MCPClient } from "./mcp-client.js";
import type { ToolsCache, ToolsCacheEntry, MCPTool, ServerConfig } from "../types.js";

export interface DiscoveryOptions {
  configDir?: string;
  forceRefresh?: boolean;
  platforms?: string[];
  apiKey: string;
  configServers?: Record<string, ServerConfig>;
}

export function readToolsCache(configDir?: string): ToolsCache | null {
  const dir = configDir ?? getConfigDir();
  const cachePath = path.join(dir, CACHE_FILE);
  try {
    const raw = fs.readFileSync(cachePath, "utf-8");
    return JSON.parse(raw) as ToolsCache;
  } catch {
    return null;
  }
}

export function writeToolsCache(cache: ToolsCache, configDir?: string): void {
  const dir = configDir ?? getConfigDir();
  fs.mkdirSync(dir, { recursive: true });
  const cachePath = path.join(dir, CACHE_FILE);
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
}

export function isCacheStale(entry: ToolsCacheEntry): boolean {
  return entry.fetched_at + CACHE_TTL_MS < Date.now();
}

export function findTool(
  toolName: string,
  cache: ToolsCache,
): { tool: MCPTool; platform: string; serverUrl: string } | null {
  for (const entry of Object.values(cache.entries)) {
    const tool = entry.tools.find((t) => t.name === toolName);
    if (tool) {
      return { tool, platform: entry.platform, serverUrl: entry.server_url };
    }
  }
  return null;
}

export async function discoverTools(options: DiscoveryOptions): Promise<ToolsCache> {
  const { configDir, forceRefresh = false, platforms: targetPlatforms, apiKey, configServers } = options;
  const dir = configDir ?? getConfigDir();

  const cache = readToolsCache(dir) ?? { version: 1, entries: {} };
  const servers = getServers(configServers);
  const platformsToProcess = targetPlatforms ?? Object.keys(servers);

  const fetchPromises: { platform: string; promise: Promise<void> }[] = [];

  for (const platform of platformsToProcess) {
    const serverUrl = servers[platform]?.url;
    if (!serverUrl) continue;

    const existing = cache.entries[platform];
    if (!forceRefresh && existing && !isCacheStale(existing)) {
      continue;
    }

    const promise = (async () => {
      const client = new MCPClient({ baseUrl: serverUrl, apiKey });
      const response = await client.toolsList();
      cache.entries[platform] = {
        platform,
        tools: response.tools,
        fetched_at: Date.now(),
        server_url: serverUrl,
      };
    })();

    fetchPromises.push({ platform, promise });
  }

  const results = await Promise.allSettled(fetchPromises.map((p) => p.promise));
  const errors: string[] = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      const reason = (results[i] as PromiseRejectedResult).reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      errors.push(`${fetchPromises[i].platform}: ${msg}`);
    }
  }

  writeToolsCache(cache, dir);

  if (errors.length > 0 && errors.length === fetchPromises.length) {
    throw new Error(`All platform refreshes failed:\n  ${errors.join("\n  ")}`);
  }

  if (errors.length > 0) {
    process.stderr.write(`Warning: some platforms failed to refresh:\n  ${errors.join("\n  ")}\n`);
  }

  return cache;
}
