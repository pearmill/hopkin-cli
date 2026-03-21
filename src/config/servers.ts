import { DEFAULT_SERVERS } from "../constants.js";
import type { ServerConfig } from "../types.js";

export function getServers(
  configServers?: Record<string, ServerConfig>,
): Record<string, ServerConfig> {
  return {
    ...DEFAULT_SERVERS,
    ...configServers,
  };
}

export function getServerUrl(
  platform: string,
  configServers?: Record<string, ServerConfig>,
): string | undefined {
  const servers = getServers(configServers);
  return servers[platform]?.url;
}

export function getPlatforms(
  configServers?: Record<string, ServerConfig>,
): string[] {
  const servers = getServers(configServers);
  return Object.keys(servers).sort();
}
