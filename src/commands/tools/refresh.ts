import { defineCommand } from "citty";
import { resolveAuth } from "../../auth/resolver.js";
import { readConfig } from "../../config/manager.js";
import { discoverTools } from "../../core/tool-discovery.js";
import { getPlatforms } from "../../config/servers.js";

export default defineCommand({
  meta: { name: "refresh", description: "Refresh tool cache from MCP servers" },
  args: {
    platform: {
      type: "string",
      description: "Only refresh tools for a specific platform",
    },
    "api-key": {
      type: "string",
      description: "API key override",
    },
  },
  async run({ args }) {
    const configDir = process.env.HOPKIN_CONFIG_DIR;
    const apiKey = resolveAuth({ apiKeyFlag: args["api-key"], configDir });
    const config = readConfig(configDir);

    const platforms = args.platform ? [args.platform] : undefined;
    const allPlatforms = platforms ?? getPlatforms(config.servers);

    for (const p of allPlatforms) {
      process.stderr.write(`Refreshing tools for ${p}...\n`);
    }

    const cache = await discoverTools({
      configDir,
      forceRefresh: true,
      platforms,
      apiKey,
      configServers: config.servers,
    });

    for (const [platform, entry] of Object.entries(cache.entries)) {
      if (!platforms || platforms.includes(platform)) {
        process.stderr.write(`  ${platform}: ${entry.tools.length} tools\n`);
      }
    }

    process.stderr.write("Done.\n");
  },
});
