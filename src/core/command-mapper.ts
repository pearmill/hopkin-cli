import type { ParsedCommand, MCPTool } from "../types.js";

/**
 * Maps platform keys to their actual tool name prefixes when they differ
 * from the default `{platform}_` / `{platform}_ads_` convention.
 */
const PLATFORM_TOOL_ALIASES: Record<string, string> = {
  gsc: "google_search_console",
};

/**
 * Detect the tool name prefix for a platform by inspecting its tools.
 * Ad platforms use `{platform}_ads_`, others use `{platform}_`.
 * Platforms with aliases (e.g. gcs → google_search_console) are checked first.
 */
export function detectToolPrefix(platform: string, tools: MCPTool[]): string {
  const alias = PLATFORM_TOOL_ALIASES[platform];
  if (alias) {
    const aliasAdsPrefix = `${alias}_ads_`;
    if (tools.some((t) => t.name.startsWith(aliasAdsPrefix))) {
      return aliasAdsPrefix;
    }
    return `${alias}_`;
  }

  const adsPrefix = `${platform}_ads_`;
  if (tools.some((t) => t.name.startsWith(adsPrefix))) {
    return adsPrefix;
  }
  return `${platform}_`;
}

/**
 * Parse an MCP tool name into a CLI command structure.
 * Supports both `{platform}_ads_{verb}_{noun}` and `{platform}_{verb}_{noun}`.
 * When platform is not provided, tries `_ads_` first, then first segment.
 */
export function toolToCommand(toolName: string, platform?: string): ParsedCommand | null {
  let prefix: string;

  if (platform) {
    const alias = PLATFORM_TOOL_ALIASES[platform];
    const base = alias ?? platform;
    // Try _ads_ variant first, then bare prefix
    const adsPrefix = `${base}_ads_`;
    if (toolName.startsWith(adsPrefix)) {
      prefix = adsPrefix;
    } else if (toolName.startsWith(`${base}_`)) {
      prefix = `${base}_`;
    } else {
      return null;
    }
  } else {
    // No platform hint: try _ads_ pattern first
    const adsIndex = toolName.indexOf("_ads_");
    if (adsIndex > 0) {
      prefix = toolName.slice(0, adsIndex) + "_ads_";
      platform = toolName.slice(0, adsIndex);
    } else {
      // Use first segment as platform
      const firstUnderscore = toolName.indexOf("_");
      if (firstUnderscore === -1) return null;
      platform = toolName.slice(0, firstUnderscore);
      prefix = `${platform}_`;
    }
  }

  const rest = toolName.slice(prefix.length);
  if (!rest) return null;

  const firstUnderscore = rest.indexOf("_");
  if (firstUnderscore === -1) {
    // Only a verb, no noun
    return null;
  }

  const verb = rest.slice(0, firstUnderscore);
  const nounRaw = rest.slice(firstUnderscore + 1);
  if (!verb || !nounRaw) return null;

  // Convert underscores in noun to hyphens for CLI display
  const noun = nounRaw.replace(/_/g, "-");

  return { platform, noun, verb };
}

/**
 * Convert a parsed CLI command back to an MCP tool name.
 * Uses the provided prefix format, defaulting to `_ads_` for backwards compat.
 */
export function commandToTool(parsed: ParsedCommand, toolPrefix?: string): string {
  const noun = parsed.noun.replace(/-/g, "_");
  const alias = PLATFORM_TOOL_ALIASES[parsed.platform];
  const prefix = toolPrefix ?? `${alias ?? parsed.platform}_ads_`;
  return `${prefix}${parsed.verb}_${noun}`;
}

/**
 * Parse a tool name for a specific platform, returning verb and noun.
 * Returns null if the tool name doesn't match the given platform.
 */
export function parseToolName(
  toolName: string,
  platform: string
): { noun: string; verb: string } | null {
  const parsed = toolToCommand(toolName, platform);
  if (!parsed || parsed.platform !== platform) return null;
  return { verb: parsed.verb, noun: parsed.noun };
}
