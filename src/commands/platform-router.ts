import { readToolsCache, discoverTools } from "../core/tool-discovery.js";
import { resolveAuth } from "../auth/resolver.js";
import { buildArgs } from "../core/arg-builder.js";
import { detectFormat, formatOutput } from "../output/formatter.js";
import { writeOutput } from "../output/writer.js";
import { streamPages } from "../pagination/stream.js";
import { executeTool, executeToolPaginated } from "../core/tool-executor.js";
import { CommandNotFoundError } from "../errors.js";
import { readConfig } from "../config/manager.js";
import type {
  OutputFormat,
  PlatformConfig,
  MCPToolCallResponse,
  MCPTool,
  ToolsCache,
} from "../types.js";

export interface GlobalOptions {
  json?: boolean;
  format?: string;
  output?: string;
  debug?: boolean;
  all?: boolean;
  limit?: number;
  fields?: string;
  account?: string;
  apiKey?: string;
  configDir?: string;
}

function parseResponseData(
  response: MCPToolCallResponse,
): { data: Record<string, unknown>[]; isRawText: boolean } {
  // Prefer structuredContent when available — it always has typed data
  if (response.structuredContent) {
    const sc = response.structuredContent;
    if (Array.isArray(sc.data)) {
      return { data: sc.data, isRawText: false };
    }
    // Non-list structured responses (e.g. ping/auth status) — wrap as single record
    const { data: _data, nextCursor: _nc, ...rest } = sc;
    return { data: [rest as Record<string, unknown>], isRawText: false };
  }

  const text = response.content[0]?.text ?? "";
  if (!text) return { data: [], isRawText: false };

  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return { data: parsed as Record<string, unknown>[], isRawText: false };
    }
    // If the parsed object contains an array-of-objects field, extract it as the data rows.
    // This handles servers (e.g. TikTok) that wrap results like {advertisers: [...], pagination: {...}, ...}
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      const arrayFields = Object.entries(obj).filter(
        ([, v]) => Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null,
      );
      if (arrayFields.length === 1) {
        return { data: arrayFields[0][1] as Record<string, unknown>[], isRawText: false };
      }
    }
    return { data: [parsed as Record<string, unknown>], isRawText: false };
  } catch {
    // Response is not JSON (e.g., markdown text) - return as raw text
    return { data: [{ text }], isRawText: true };
  }
}

/**
 * Given a platform and remaining CLI args, find the matching MCP tool.
 *
 * Strategy: try multiple tool name constructions against the cache:
 *   1. `{platform}_ads_{arg1}` (single-word commands like `ping`)
 *   2. `{platform}_ads_{verb}_{noun}` where verb=argv[1], noun=argv[0] (e.g., `campaigns list` → `list_campaigns`)
 *   3. `{platform}_ads_get_{noun}` (default verb, e.g., `campaigns` → `get_campaigns`)
 *   4. Fallback: search all tools for partial match
 */
export function findToolForCommand(
  platform: string,
  commandArgs: string[],
  cache: ToolsCache,
): { tool: MCPTool; serverUrl: string } | null {
  const platformEntry = cache.entries[platform];
  if (!platformEntry) return null;

  const tools = platformEntry.tools;
  const serverUrl = platformEntry.server_url;
  const prefix = `${platform}_ads_`;

  // Helper: check if a tool name matches
  const find = (name: string) => {
    const tool = tools.find((t) => t.name === name);
    return tool ? { tool, serverUrl } : null;
  };

  if (commandArgs.length === 0) return null;

  // Normalize: convert hyphens to underscores
  const normalized = commandArgs.map((a) => a.replace(/-/g, "_"));

  if (normalized.length === 1) {
    // Single arg: try direct match, then as noun with default verb "list" then "get"
    const arg = normalized[0];
    const direct = find(`${prefix}${arg}`);
    if (direct) return direct;

    const asList = find(`${prefix}list_${arg}`);
    if (asList) return asList;

    const asGet = find(`${prefix}get_${arg}`);
    if (asGet) return asGet;
  }

  if (normalized.length >= 2) {
    // Two+ args: try {noun} {verb} → {verb}_{noun} (CLI order is noun-first)
    const [first, second, ...rest] = normalized;
    const nounParts = [first, ...rest].join("_");

    // noun verb → verb_noun (e.g., `campaigns list` → `list_campaigns`)
    const nounVerb = find(`${prefix}${second}_${nounParts}`);
    if (nounVerb) return nounVerb;

    // verb noun → verb_noun (e.g., `list campaigns` → `list_campaigns`)
    const verbNoun = find(`${prefix}${first}_${[second, ...rest].join("_")}`);
    if (verbNoun) return verbNoun;

    // Try direct concatenation: arg1_arg2_arg3...
    const joined = normalized.join("_");
    const directJoin = find(`${prefix}${joined}`);
    if (directJoin) return directJoin;
  }

  // Fallback: match search terms against the noun portion (after verb) of each tool
  const searchTerms = normalized.join("_");
  const candidates = tools.filter((t) => {
    const suffix = t.name.slice(prefix.length);
    const verbEnd = suffix.indexOf("_");
    if (verbEnd === -1) return suffix === searchTerms;
    const noun = suffix.slice(verbEnd + 1);
    return noun === searchTerms;
  });
  if (candidates.length === 1) {
    return { tool: candidates[0], serverUrl };
  }

  return null;
}

export async function routePlatformCommand(
  argv: string[],
  globalOptions: GlobalOptions = {},
): Promise<void> {
  const platform = argv[0];

  if (!platform) {
    throw new CommandNotFoundError(
      argv.join(" "),
      `Usage: hopkin <platform> <resource> [verb] [flags]`,
    );
  }

  // Split argv into command parts (non-flag args after platform) and flags
  const commandArgs: string[] = [];
  const flagArgv: string[] = [];
  let parsingFlags = false;

  for (let i = 1; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      parsingFlags = true;
    }
    if (parsingFlags) {
      flagArgv.push(argv[i]);
    } else {
      commandArgs.push(argv[i]);
    }
  }

  if (commandArgs.length === 0) {
    throw new CommandNotFoundError(
      platform,
      `Usage: hopkin ${platform} <resource> [verb] [flags]. Run "hopkin tools list --platform ${platform}" to see available commands.`,
    );
  }

  const configDir = globalOptions.configDir;
  const config = readConfig(configDir);

  // Load tools cache, auto-refresh if needed
  let cache = readToolsCache(configDir);
  let found = cache ? findToolForCommand(platform, commandArgs, cache) : null;

  if (!found) {
    try {
      const apiKey = resolveAuth({
        apiKeyFlag: globalOptions.apiKey,
        configDir,
      });

      cache = await discoverTools({
        configDir,
        forceRefresh: true,
        platforms: [platform],
        apiKey,
        configServers: config.servers,
      });
      found = findToolForCommand(platform, commandArgs, cache);
    } catch {
      // Auto-refresh failed (network error, auth issue, etc.)
      // Fall through to suggestion logic with whatever cache we have
    }
  }

  if (!found) {
    // We already auto-refreshed — suggest similar commands instead of asking to refresh again
    const suggestions = suggestCommands(platform, commandArgs, cache);
    const hint = suggestions.length > 0
      ? `Did you mean?\n${suggestions.map((s) => `  hopkin ${platform} ${s}`).join("\n")}`
      : `Run "hopkin tools list --platform ${platform}" to see available commands.`;
    throw new CommandNotFoundError(
      `${platform} ${commandArgs.join(" ")}`,
      hint,
    );
  }

  const { tool, serverUrl } = found;

  // Resolve auth
  const apiKey = resolveAuth({
    apiKeyFlag: globalOptions.apiKey,
    configDir,
  });

  // Build args from flag argv and global options
  const flagArgs = parseFlags(flagArgv);

  // Merge --account from global options
  if (globalOptions.account) {
    flagArgs.account = globalOptions.account;
  }

  // Load platform config
  const platformConfig =
    (config[platform] as PlatformConfig | undefined) ?? undefined;
  const platformConfigRecord = platformConfig
    ? Object.fromEntries(
        Object.entries(platformConfig).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
    : undefined;

  const args = buildArgs(flagArgs, tool.inputSchema, platformConfigRecord);

  // Determine output format
  const format = detectFormat({
    isTTY: process.stdout.isTTY ?? false,
    json: globalOptions.json,
    format: globalOptions.format as OutputFormat | undefined,
  });

  const fields = globalOptions.fields?.split(",").map((f) => f.trim());

  const executeOpts = {
    platform,
    toolName: tool.name,
    args,
    apiKey,
    serverUrl,
    debug: globalOptions.debug,
    all: globalOptions.all,
    limit: globalOptions.limit,
  };

  if (globalOptions.all) {
    const pages = executeToolPaginated(executeOpts);
    await streamPages(pages, format, {
      fields,
      output: globalOptions.output,
    });
  } else {
    const response = await executeTool(executeOpts);
    const { data, isRawText } = parseResponseData(response);
    if (isRawText) {
      // Raw text response (markdown, etc.) — output directly
      writeOutput(data[0]?.text as string ?? "", { output: globalOptions.output });
    } else {
      const output = formatOutput(data, format, { fields, pretty: true });
      writeOutput(output + "\n", { output: globalOptions.output });
    }
  }
}

/**
 * Suggest similar commands when a tool isn't found.
 * Returns human-readable command strings like "accounts list".
 */
function suggestCommands(
  platform: string,
  commandArgs: string[],
  cache: ToolsCache | null,
): string[] {
  if (!cache) return [];
  const entry = cache.entries[platform];
  if (!entry) return [];

  const prefix = `${platform}_ads_`;
  const searchTerms = commandArgs.map((a) => a.replace(/-/g, "_"));

  const scored: { cmd: string; score: number }[] = [];
  for (const tool of entry.tools) {
    if (!tool.name.startsWith(prefix)) continue;
    const suffix = tool.name.slice(prefix.length);
    // Extract verb and noun from tool name (e.g., "list_ad_accounts" → verb="list", noun="ad_accounts")
    const verbEnd = suffix.indexOf("_");
    if (verbEnd === -1) continue;
    const verb = suffix.slice(0, verbEnd);
    const noun = suffix.slice(verbEnd + 1);

    // Score: count how many search terms appear in the tool name
    let score = 0;
    for (const term of searchTerms) {
      if (suffix.includes(term)) score += 2;
      else if (term.split("_").some((p) => suffix.includes(p))) score += 1;
    }
    if (score > 0) {
      const displayNoun = noun.replace(/_/g, "-");
      scored.push({ cmd: `${displayNoun} ${verb}`, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.cmd);
}

/**
 * Parse raw argv flags into a key-value map.
 * Handles --key=value, --key value, and --boolean-flag patterns.
 */
function parseFlags(argv: string[]): Record<string, unknown> {
  const flags: Record<string, unknown> = {};
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        flags[key] = arg.slice(eqIdx + 1);
      } else {
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith("--")) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    }

    i++;
  }

  return flags;
}
