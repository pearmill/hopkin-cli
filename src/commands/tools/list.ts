import { defineCommand } from "citty";
import { readToolsCache, discoverTools, isCacheStale } from "../../core/tool-discovery.js";
import { resolveAuth } from "../../auth/resolver.js";
import { readConfig } from "../../config/manager.js";
import { getPlatforms } from "../../config/servers.js";
import { formatOutput, detectFormat } from "../../output/formatter.js";
import type { OutputFormat } from "../../types.js";

export default defineCommand({
  meta: { name: "list", description: "List available tools" },
  args: {
    platform: {
      type: "string",
      description: "Filter tools by platform",
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
    format: {
      type: "string",
      description: "Output format: table, json, csv, tsv",
    },
    "api-key": {
      type: "string",
      description: "API key for authentication",
    },
  },
  async run({ args }) {
    const configDir = process.env.HOPKIN_CONFIG_DIR;
    const config = readConfig(configDir);
    let cache = readToolsCache(configDir);

    // Determine which platforms need fetching
    const allPlatforms = getPlatforms(config.servers);
    const targetPlatforms = args.platform ? [args.platform] : allPlatforms;
    const missingPlatforms = targetPlatforms.filter(
      (p) => !cache?.entries[p] || isCacheStale(cache.entries[p]),
    );

    // Auto-fetch any missing or stale platforms
    if (missingPlatforms.length > 0) {
      try {
        const apiKey = resolveAuth({
          apiKeyFlag: args["api-key"] as string | undefined,
          configDir,
        });
        process.stderr.write(
          `Fetching tools for ${missingPlatforms.join(", ")}...\n`,
        );
        cache = await discoverTools({
          configDir,
          forceRefresh: false,
          platforms: missingPlatforms,
          apiKey,
          configServers: config.servers,
        });
      } catch {
        // If auto-fetch fails and we have no cache at all, show helpful message
        if (!cache || Object.keys(cache.entries).length === 0) {
          process.stderr.write(
            'No tool cache found. Run "hopkin tools refresh" to fetch tools.\n',
          );
          return;
        }
        // Otherwise fall through and show what we have
      }
    }

    if (!cache || Object.keys(cache.entries).length === 0) {
      process.stderr.write(
        'No tool cache found. Run "hopkin tools refresh" to fetch tools.\n',
      );
      return;
    }

    const rows: Record<string, unknown>[] = [];

    for (const [platform, entry] of Object.entries(cache.entries)) {
      if (args.platform && platform !== args.platform) {
        continue;
      }
      for (const tool of entry.tools) {
        rows.push({
          name: tool.name,
          description: tool.description,
          platform,
        });
      }
    }

    const format = detectFormat({
      isTTY: !!process.stdout.isTTY,
      json: args.json,
      format: args.format as OutputFormat | undefined,
    });

    const output = formatOutput(rows, format, { pretty: true });
    process.stdout.write(output + "\n");
  },
});
