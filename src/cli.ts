import { defineCommand, runCommand } from "citty";
import { VERSION, CLI_NAME } from "./constants.js";
import { getPlatforms } from "./config/servers.js";
import { readConfig } from "./config/manager.js";
import { routePlatformCommand } from "./commands/platform-router.js";
import type { GlobalOptions } from "./commands/platform-router.js";
import { readToolsCache, discoverTools, isCacheStale } from "./core/tool-discovery.js";
import { resolveAuth } from "./auth/resolver.js";
import { printRootHelp, printPlatformHelp, printResourceHelp, printToolHelp } from "./help.js";
import type { ToolsCache } from "./types.js";

const main = defineCommand({
  meta: {
    name: CLI_NAME,
    version: VERSION,
    description: "Hopkin — ad platform management from the terminal",
  },
  args: {
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
    format: {
      type: "string",
      description: "Output format: table, json, csv, tsv",
    },
    output: {
      type: "string",
      description: "Write output to file",
    },
    debug: {
      type: "boolean",
      description: "Enable debug logging",
      default: false,
    },
    all: {
      type: "boolean",
      description: "Fetch all pages",
      default: false,
    },
    limit: {
      type: "string",
      description: "Max number of results per page",
    },
    fields: {
      type: "string",
      description: "Comma-separated list of fields to include",
    },
    account: {
      type: "string",
      description: "Account ID override",
    },
    "api-key": {
      type: "string",
      description: "API key override",
    },
    "no-color": {
      type: "boolean",
      description: "Disable color output",
      default: false,
    },
  },
  subCommands: {
    auth: () => import("./commands/auth/index.js").then((m) => m.default),
    config: () => import("./commands/config/index.js").then((m) => m.default),
    tools: () => import("./commands/tools/index.js").then((m) => m.default),
    apikeys: () => import("./commands/apikeys/index.js").then((m) => m.default),
    completion: () =>
      import("./commands/completion.js").then((m) => m.default),
  },
});

export async function runCli(): Promise<void> {
  const args = process.argv.slice(2);
  const hasHelp = args.includes("--help") || args.includes("-h");

  // Check if the first arg is a known builtin subcommand
  const builtinCommands = new Set(["auth", "config", "tools", "apikeys", "completion"]);
  const firstArg = args[0];

  if (!firstArg || firstArg.startsWith("-") || builtinCommands.has(firstArg)) {
    if (!firstArg || (firstArg.startsWith("-") && !builtinCommands.has(firstArg))) {
      // No command or only flags — show root help
      const cache = await ensureFreshCache();
      await printRootHelp(cache);
      return;
    }
    if (hasHelp && builtinCommands.has(firstArg)) {
      // Builtin subcommand --help: show usage via showUsage
      const { showUsage } = await import("citty");
      const subCommandLoaders = main.subCommands as Record<string, () => Promise<unknown>>;
      const loader = subCommandLoaders[firstArg];
      if (loader) {
        const subCmd = await loader() as import("citty").CommandDef;
        await showUsage(subCmd);
        return;
      }
    }
    await runCommand(main, { rawArgs: args });
    return;
  }

  // Check if the first arg is a platform command
  const config = readConfig();
  const platforms = getPlatforms(config.servers);

  if (platforms.includes(firstArg)) {
    const nonFlagArgs = extractNonFlagArgs(args);
    // No subcommand (e.g. `hopkin meta`) or explicit --help → show help
    if (hasHelp || nonFlagArgs.length <= 1) {
      await handlePlatformHelp(firstArg, args);
      return;
    }
    const globalOptions = parseGlobalFlags(args);
    await routePlatformCommand(nonFlagArgs, globalOptions);
    return;
  }

  // Fall through to citty (will show an error for unknown commands)
  await runCommand(main, { rawArgs: args });
}

// ── Platform help routing ───────────────────────────────────────────

async function handlePlatformHelp(
  platform: string,
  args: string[],
): Promise<void> {
  const cache = await ensureFreshCache([platform]);

  if (!cache || !cache.entries[platform]) {
    process.stderr.write(
      `No tools found for "${platform}". Check your auth and try "hopkin tools refresh".\n`,
    );
    return;
  }

  // Collect non-flag, non-help args after the platform name
  const commandArgs = args
    .slice(1)
    .filter((a) => a !== "--help" && a !== "-h" && !a.startsWith("--"));

  if (commandArgs.length === 0) {
    // `hopkin meta --help`
    await printPlatformHelp(platform, cache);
    return;
  }

  // If only one arg, check if it's a resource name first (show resource overview)
  // e.g., `hopkin meta campaigns --help` → show all campaign verbs
  if (commandArgs.length === 1) {
    const { getResourceGroups } = await import("./help.js");
    const groups = getResourceGroups(cache.entries[platform]);
    const resourceKey = commandArgs[0].replace(/-/g, "_");
    // Also check with hyphens since groups use hyphenated keys
    const hyphenKey = commandArgs[0].replace(/_/g, "-");

    if (groups.has(hyphenKey) || groups.has(resourceKey)) {
      await printResourceHelp(platform, hyphenKey, cache);
      return;
    }
  }

  // Try to resolve a specific tool (multi-arg like `campaigns list`, or standalone like `ping`)
  const { findToolForCommand } = await import("./commands/platform-router.js");
  const found = findToolForCommand(platform, commandArgs, cache);

  if (found) {
    await printToolHelp(platform, commandArgs, found.tool);
    return;
  }

  // Last resort — show platform help
  process.stderr.write(
    `Unknown command "${commandArgs.join(" ")}" for ${platform}. Showing platform help.\n\n`,
  );
  await printPlatformHelp(platform, cache);
}

// ── Cache management ────────────────────────────────────────────────

async function ensureFreshCache(
  requiredPlatforms?: string[],
): Promise<ToolsCache | null> {
  const configDir = process.env.HOPKIN_CONFIG_DIR;
  const config = readConfig(configDir);
  let cache = readToolsCache(configDir);
  const allPlatforms = requiredPlatforms ?? getPlatforms(config.servers);

  const stalePlatforms = allPlatforms.filter(
    (p) => !cache?.entries[p] || isCacheStale(cache.entries[p]),
  );

  if (stalePlatforms.length > 0) {
    try {
      const apiKey = resolveAuth({ configDir });
      cache = await discoverTools({
        configDir,
        forceRefresh: false,
        platforms: stalePlatforms,
        apiKey,
        configServers: config.servers,
      });
    } catch {
      // Auth missing or network issue — use whatever cache we have
    }
  }

  return cache;
}

// ── Flag parsing ────────────────────────────────────────────────────

function parseGlobalFlags(args: string[]): GlobalOptions {
  const options: GlobalOptions = {};
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--debug") {
      options.debug = true;
    } else if (arg === "--all") {
      options.all = true;
    } else if (arg === "--no-color") {
      // handled elsewhere
    } else if (arg === "--format" && args[i + 1]) {
      options.format = args[++i];
    } else if (arg.startsWith("--format=")) {
      options.format = arg.slice("--format=".length);
    } else if (arg === "--output" && args[i + 1]) {
      options.output = args[++i];
    } else if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
    } else if (arg === "--limit" && args[i + 1]) {
      options.limit = Number(args[++i]);
    } else if (arg.startsWith("--limit=")) {
      options.limit = Number(arg.slice("--limit=".length));
    } else if (arg === "--fields" && args[i + 1]) {
      options.fields = args[++i];
    } else if (arg.startsWith("--fields=")) {
      options.fields = arg.slice("--fields=".length);
    } else if (arg === "--account" && args[i + 1]) {
      options.account = args[++i];
    } else if (arg.startsWith("--account=")) {
      options.account = arg.slice("--account=".length);
    } else if (arg === "--api-key" && args[i + 1]) {
      options.apiKey = args[++i];
    } else if (arg.startsWith("--api-key=")) {
      options.apiKey = arg.slice("--api-key=".length);
    }
    i++;
  }
  return options;
}

function extractNonFlagArgs(args: string[]): string[] {
  const globalFlags = new Set([
    "--json", "--debug", "--all", "--no-color",
  ]);
  const globalFlagsWithValue = new Set([
    "--format", "--output", "--limit", "--fields", "--account", "--api-key",
  ]);

  const result: string[] = [];
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (globalFlags.has(arg)) {
      // skip
    } else if (globalFlagsWithValue.has(arg)) {
      i++; // skip value too
    } else if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      const flagName = eqIdx !== -1 ? arg.slice(0, eqIdx) : arg;
      if (!globalFlagsWithValue.has(flagName)) {
        result.push(arg);
      }
    } else {
      result.push(arg);
    }
    i++;
  }
  return result;
}

export default main;
