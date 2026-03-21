export const VERSION = "0.1.0";
export const CLI_NAME = "hopkin";

export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  AUTH_ERROR: 2,
  SERVER_ERROR: 3,
  NOT_FOUND: 4,
  RATE_LIMIT: 5,
} as const;

export const DEFAULT_SERVERS: Record<string, { url: string }> = {
  meta: { url: "https://meta.mcp.hopkin.ai" },
  google: { url: "https://google.mcp.hopkin.ai" },
  linkedin: { url: "https://linkedin.mcp.hopkin.ai" },
  reddit: { url: "https://reddit.mcp.hopkin.ai" },
  tiktok: { url: "https://tiktok.mcp.hopkin.ai" }
};

export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const DEFAULT_PAGE_SIZE = 25;
export const CONFIG_DIR_NAME = "hopkin";
export const CONFIG_FILE = "config.json";
export const CREDENTIALS_FILE = "credentials.json";
export const CACHE_FILE = "tools-cache.json";
