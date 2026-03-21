import type { ParsedCommand } from "../types.js";

const ADS_SEPARATOR = "_ads_";

/**
 * Parse an MCP tool name into a CLI command structure.
 * Tool name pattern: {platform}_ads_{verb}_{noun_with_underscores}
 */
export function toolToCommand(toolName: string): ParsedCommand | null {
  const adsIndex = toolName.indexOf(ADS_SEPARATOR);
  if (adsIndex === -1) return null;

  const platform = toolName.slice(0, adsIndex);
  if (!platform) return null;

  const rest = toolName.slice(adsIndex + ADS_SEPARATOR.length);
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
 */
export function commandToTool(parsed: ParsedCommand): string {
  const noun = parsed.noun.replace(/-/g, "_");
  return `${parsed.platform}_ads_${parsed.verb}_${noun}`;
}

/**
 * Parse a tool name for a specific platform, returning verb and noun.
 * Returns null if the tool name doesn't match the given platform.
 */
export function parseToolName(
  toolName: string,
  platform: string
): { noun: string; verb: string } | null {
  const parsed = toolToCommand(toolName);
  if (!parsed || parsed.platform !== platform) return null;
  return { verb: parsed.verb, noun: parsed.noun };
}
