import { VERSION, CLI_NAME } from "./constants.js";
import { COLORS, supportsColor } from "./output/colors.js";
import { schemaToFlags } from "./core/schema-to-flags.js";
import type { ToolsCache, ToolsCacheEntry, MCPTool, FlagDefinition } from "./types.js";

// ── Chalk helpers (lazy-loaded) ─────────────────────────────────────

interface Stylers {
  primary: (s: string) => string;
  heading: (s: string) => string;
  flag: (s: string) => string;
  muted: (s: string) => string;
  success: (s: string) => string;
  cmd: (s: string) => string;
}

async function getStylers(): Promise<Stylers> {
  if (!supportsColor()) {
    const id = (s: string) => s;
    return { primary: id, heading: id, flag: id, muted: id, success: id, cmd: id };
  }
  const { default: chalk } = await import("chalk");
  return {
    primary: (s) => chalk.hex(COLORS.primary)(s),
    heading: (s) => chalk.bold(s),
    flag: (s) => chalk.hex(COLORS.info)(s),
    muted: (s) => chalk.hex(COLORS.muted)(s),
    success: (s) => chalk.hex(COLORS.success)(s),
    cmd: (s) => chalk.cyan(s),
  };
}

// ── Shared helpers ──────────────────────────────────────────────────

/**
 * Derive a CLI-friendly command name from an MCP tool name.
 * e.g., meta_ads_list_campaigns → { verb: "list", noun: "campaigns" }
 *        meta_ads_ping          → { verb: "ping", noun: null }
 */
function parseToolSuffix(
  toolName: string,
  platform: string,
): { verb: string; noun: string | null } {
  const prefix = `${platform}_ads_`;
  if (!toolName.startsWith(prefix)) return { verb: toolName, noun: null };
  const rest = toolName.slice(prefix.length);
  const idx = rest.indexOf("_");
  if (idx === -1) return { verb: rest, noun: null };
  return { verb: rest.slice(0, idx), noun: rest.slice(idx + 1).replace(/_/g, "-") };
}

/**
 * Derive resource groups from a platform's tools.
 * Returns a map: resourceName → [{ verb, tool }]
 */
export { groupToolsByResource as getResourceGroups };

function groupToolsByResource(
  entry: ToolsCacheEntry,
): Map<string, { verb: string; tool: MCPTool }[]> {
  const groups = new Map<string, { verb: string; tool: MCPTool }[]>();
  const standalone: { verb: string; tool: MCPTool }[] = [];

  for (const tool of entry.tools) {
    const { verb, noun } = parseToolSuffix(tool.name, entry.platform);
    if (noun) {
      const list = groups.get(noun) ?? [];
      list.push({ verb, tool });
      groups.set(noun, list);
    } else {
      standalone.push({ verb, tool });
    }
  }

  // Put standalone commands under a special key
  if (standalone.length > 0) {
    groups.set("_standalone", standalone);
  }

  return groups;
}

function formatFlagLine(f: FlagDefinition, s: Stylers): string {
  const nameStr = `--${f.name}`;
  let meta = "";
  if (f.type === "string" || f.type === "number") {
    meta = ` ${s.muted(`<${f.type}>`)}`;
  }
  const req = f.required ? s.primary(" (required)") : "";
  const desc = f.description ?? "";
  const choices = f.choices ? ` ${s.muted(`[${f.choices.join(", ")}]`)}` : "";
  const def = f.default !== undefined ? ` ${s.muted(`(default: ${f.default})`)}` : "";
  return `  ${s.flag(nameStr)}${meta}${req}  ${desc}${choices}${def}`;
}

// ── Root help ───────────────────────────────────────────────────────

export async function printRootHelp(cache: ToolsCache | null): Promise<void> {
  const s = await getStylers();
  const lines: string[] = [];

  lines.push(s.primary("Hopkin CLI") + ` ${s.muted(`v${VERSION}`)}`);
  lines.push(s.muted("Ad platform management from the terminal"));
  lines.push("");
  lines.push(s.heading("USAGE:"));
  lines.push(`  ${CLI_NAME} ${s.muted("<command>")} ${s.muted("[options]")}`);
  lines.push("");
  lines.push(s.heading("COMMANDS:"));
  lines.push(`  ${s.cmd("auth")}          Manage authentication`);
  lines.push(`  ${s.cmd("config")}        Manage CLI configuration`);
  lines.push(`  ${s.cmd("tools")}         Manage MCP tool discovery`);
  lines.push(`  ${s.cmd("apikeys")}       Manage API keys`);
  lines.push(`  ${s.cmd("skill")}         Install Claude Code skill`);
  lines.push(`  ${s.cmd("completion")}    Generate shell completion scripts`);

  if (cache && Object.keys(cache.entries).length > 0) {
    lines.push("");
    lines.push(s.heading("PLATFORMS:"));
    for (const p of Object.keys(cache.entries).sort()) {
      const entry = cache.entries[p];
      const resources = deriveResources(entry);
      const desc = resources.length > 0
        ? s.muted(resources.join(", "))
        : s.muted(`${entry.tools.length} tools`);
      lines.push(`  ${s.success(p.padEnd(12))}  ${desc}`);
    }
  }

  lines.push("");
  lines.push(s.heading("GLOBAL OPTIONS:"));
  printGlobalFlags(lines, s);
  lines.push("");
  lines.push(s.heading("EXAMPLES:"));
  lines.push(`  ${s.muted("$")} ${CLI_NAME} auth set-key ${s.muted("hpk_live_xxx")}`);
  lines.push(`  ${s.muted("$")} ${CLI_NAME} meta campaigns ${s.flag("--account")} ${s.muted("123456")}`);
  lines.push(`  ${s.muted("$")} ${CLI_NAME} google ad-accounts ${s.flag("--json")}`);
  lines.push(`  ${s.muted("$")} ${CLI_NAME} tools list ${s.flag("--platform")} ${s.muted("meta")}`);
  lines.push("");

  process.stdout.write(lines.join("\n") + "\n");
}

// ── Platform help: `hopkin meta --help` ─────────────────────────────

export async function printPlatformHelp(
  platform: string,
  cache: ToolsCache,
): Promise<void> {
  const s = await getStylers();
  const entry = cache.entries[platform];
  if (!entry) {
    process.stderr.write(`No tools cached for platform "${platform}".\n`);
    return;
  }

  const groups = groupToolsByResource(entry);
  const lines: string[] = [];

  lines.push(s.primary(`hopkin ${platform}`) + ` ${s.muted(`— ${entry.tools.length} tools`)}`);
  lines.push("");
  lines.push(s.heading("USAGE:"));
  lines.push(`  ${CLI_NAME} ${s.success(platform)} ${s.muted("<resource>")} ${s.muted("[verb]")} ${s.muted("[flags]")}`);
  lines.push("");
  lines.push(s.heading("RESOURCES:"));

  const sortedGroups = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [resource, tools] of sortedGroups) {
    if (resource === "_standalone") continue;
    const verbs = tools.map((t) => t.verb).sort();
    lines.push(`  ${s.cmd(resource.padEnd(24))}  ${s.muted(verbs.join(", "))}`);
  }

  // Standalone commands (no resource noun)
  const standalone = groups.get("_standalone");
  if (standalone && standalone.length > 0) {
    lines.push("");
    lines.push(s.heading("COMMANDS:"));
    for (const { verb, tool } of standalone.sort((a, b) => a.verb.localeCompare(b.verb))) {
      const desc = tool.description.length > 60
        ? tool.description.slice(0, 59) + "…"
        : tool.description;
      lines.push(`  ${s.cmd(verb.padEnd(24))}  ${s.muted(desc)}`);
    }
  }

  lines.push("");
  lines.push(s.heading("EXAMPLES:"));
  // Pick a real resource for the examples
  const exampleResource = sortedGroups.find(([r]) => r !== "_standalone")?.[0] ?? "campaigns";
  lines.push(`  ${s.muted("$")} ${CLI_NAME} ${platform} ${exampleResource} ${s.flag("--json")}`);
  lines.push(`  ${s.muted("$")} ${CLI_NAME} ${platform} ${exampleResource} ${s.flag("--help")}`);
  lines.push(`  ${s.muted("$")} ${CLI_NAME} ${platform} ping ${s.flag("--reason")} ${s.muted('"test"')}`);
  lines.push("");

  process.stdout.write(lines.join("\n") + "\n");
}

// ── Resource help: `hopkin meta campaigns --help` ───────────────────

export async function printResourceHelp(
  platform: string,
  resource: string,
  cache: ToolsCache,
): Promise<void> {
  const s = await getStylers();
  const entry = cache.entries[platform];
  if (!entry) {
    process.stderr.write(`No tools cached for platform "${platform}".\n`);
    return;
  }

  const groups = groupToolsByResource(entry);
  const tools = groups.get(resource);

  if (!tools || tools.length === 0) {
    process.stderr.write(
      `No commands found for "${platform} ${resource}". Run "hopkin ${platform} --help" to see available resources.\n`,
    );
    return;
  }

  const lines: string[] = [];
  lines.push(s.primary(`hopkin ${platform} ${resource}`) + ` ${s.muted(`— ${tools.length} commands`)}`);
  lines.push("");
  lines.push(s.heading("USAGE:"));
  lines.push(`  ${CLI_NAME} ${s.success(platform)} ${s.cmd(resource)} ${s.muted("[verb]")} ${s.muted("[flags]")}`);
  lines.push("");
  lines.push(s.heading("COMMANDS:"));

  for (const { verb, tool } of tools.sort((a, b) => a.verb.localeCompare(b.verb))) {
    const desc = tool.description.length > 70
      ? tool.description.slice(0, 69) + "…"
      : tool.description;
    lines.push(`  ${s.cmd(verb.padEnd(16))}  ${desc}`);
  }

  lines.push("");
  lines.push(s.heading("EXAMPLES:"));
  const defaultVerb = tools.find((t) => t.verb === "list") ? "list" : tools[0].verb;
  lines.push(`  ${s.muted("$")} ${CLI_NAME} ${platform} ${resource} ${s.flag("--json")}`);
  lines.push(`  ${s.muted("$")} ${CLI_NAME} ${platform} ${resource} ${defaultVerb} ${s.flag("--help")}`);
  lines.push("");
  lines.push(s.muted(`Run "hopkin ${platform} ${resource} <verb> --help" for command-specific flags.`));
  lines.push("");

  process.stdout.write(lines.join("\n") + "\n");
}

// ── Tool help: `hopkin meta campaigns list --help` ──────────────────

export async function printToolHelp(
  platform: string,
  commandArgs: string[],
  tool: MCPTool,
): Promise<void> {
  const s = await getStylers();
  const flags = schemaToFlags(tool.inputSchema);
  const cliPath = `${CLI_NAME} ${platform} ${commandArgs.join(" ")}`;

  const lines: string[] = [];
  lines.push(s.primary(cliPath));
  lines.push("");
  lines.push(tool.description);
  lines.push("");
  lines.push(s.heading("USAGE:"));
  lines.push(`  ${cliPath} ${s.muted("[flags]")}`);

  if (flags.length > 0) {
    const required = flags.filter((f) => f.required);
    const optional = flags.filter((f) => !f.required);

    if (required.length > 0) {
      lines.push("");
      lines.push(s.heading("REQUIRED FLAGS:"));
      for (const f of required) {
        lines.push(formatFlagLine(f, s));
      }
    }

    if (optional.length > 0) {
      lines.push("");
      lines.push(s.heading("OPTIONAL FLAGS:"));
      for (const f of optional) {
        lines.push(formatFlagLine(f, s));
      }
    }
  }

  lines.push("");
  lines.push(s.heading("GLOBAL FLAGS:"));
  lines.push(`  ${s.flag("--json")}            Output as JSON`);
  lines.push(`  ${s.flag("--format")} ${s.muted("<fmt>")}    Output format: table, json, csv, tsv`);
  lines.push(`  ${s.flag("--all")}             Fetch all pages`);
  lines.push(`  ${s.flag("--account")} ${s.muted("<id>")}    Account ID override`);
  lines.push(`  ${s.flag("--debug")}           Enable debug logging`);
  lines.push("");

  // Build an example with required flags
  const requiredExample = flags
    .filter((f) => f.required)
    .map((f) => `${s.flag(`--${f.name}`)} ${s.muted(`<${f.name}>`)}`)
    .join(" ");
  lines.push(s.heading("EXAMPLE:"));
  lines.push(`  ${s.muted("$")} ${cliPath} ${requiredExample} ${s.flag("--json")}`);
  lines.push("");

  process.stdout.write(lines.join("\n") + "\n");
}

// ── Shared pieces ───────────────────────────────────────────────────

function printGlobalFlags(lines: string[], s: Stylers): void {
  lines.push(`  ${s.flag("--json")}            Output as JSON`);
  lines.push(`  ${s.flag("--format")} ${s.muted("<fmt>")}    Output format: table, json, csv, tsv`);
  lines.push(`  ${s.flag("--output")} ${s.muted("<file>")}   Write output to file`);
  lines.push(`  ${s.flag("--account")} ${s.muted("<id>")}    Account ID override`);
  lines.push(`  ${s.flag("--api-key")} ${s.muted("<key>")}   API key override`);
  lines.push(`  ${s.flag("--all")}             Fetch all pages`);
  lines.push(`  ${s.flag("--limit")} ${s.muted("<n>")}       Max results per page`);
  lines.push(`  ${s.flag("--fields")} ${s.muted("<list>")}   Comma-separated fields to include`);
  lines.push(`  ${s.flag("--debug")}           Enable debug logging`);
  lines.push(`  ${s.flag("--no-color")}        Disable color output`);
  lines.push(`  ${s.flag("-v, --version")}     Show version`);
  lines.push(`  ${s.flag("-h, --help")}        Show this help`);
}

function deriveResources(entry: ToolsCacheEntry): string[] {
  const prefix = `${entry.platform}_ads_`;
  const nouns = new Set<string>();
  for (const tool of entry.tools) {
    if (!tool.name.startsWith(prefix)) continue;
    const rest = tool.name.slice(prefix.length);
    const match = rest.match(/^(?:list|get|create|update|delete)_(.+)/);
    if (match) {
      nouns.add(match[1].replace(/_/g, "-"));
    }
  }
  return [...nouns].sort();
}
