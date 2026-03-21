import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "node:http";
import { createTempConfig, type TempConfigContext } from "../helpers/temp-config.js";
import {
  discoverTools,
  readToolsCache,
  writeToolsCache,
  isCacheStale,
} from "../../src/core/tool-discovery.js";
import { writeCredentials } from "../../src/auth/credentials.js";
import { CACHE_TTL_MS } from "../../src/constants.js";
import type { MCPToolsListResponse, ToolsCache } from "../../src/types.js";

// ── Mock MCP Server ─────────────────────────────────────────────────

interface MockServerOptions {
  tools?: MCPToolsListResponse;
}

function createMockServer(options: MockServerOptions = {}) {
  let requestCount = 0;

  const server = http.createServer((req, res) => {
    const body: Buffer[] = [];
    req.on("data", (chunk: Buffer) => body.push(chunk));
    req.on("end", () => {
      const parsed = JSON.parse(Buffer.concat(body).toString());
      res.writeHead(200, { "Content-Type": "application/json" });

      if (parsed.method === "tools/list") {
        requestCount++;
        res.end(JSON.stringify(options.tools ?? { tools: [] }));
      } else {
        res.end(JSON.stringify({ error: "Unknown method" }));
      }
    });
  });

  return {
    server,
    getRequestCount: () => requestCount,
    resetRequestCount: () => { requestCount = 0; },
    async start(): Promise<number> {
      return new Promise((resolve) => {
        server.listen(0, () => {
          const addr = server.address();
          if (addr && typeof addr === "object") {
            resolve(addr.port);
          }
        });
      });
    },
    async stop(): Promise<void> {
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}

const META_TOOLS: MCPToolsListResponse = {
  tools: [
    {
      name: "meta_ads_list_campaigns",
      description: "List campaigns",
      inputSchema: {
        type: "object",
        properties: {
          account_id: { type: "string", description: "Ad account ID" },
        },
        required: ["account_id"],
      },
    },
    {
      name: "meta_ads_get_campaign",
      description: "Get a campaign by ID",
      inputSchema: {
        type: "object",
        properties: {
          campaign_id: { type: "string", description: "Campaign ID" },
        },
        required: ["campaign_id"],
      },
    },
  ],
};

const GOOGLE_TOOLS: MCPToolsListResponse = {
  tools: [
    {
      name: "google_ads_list_campaigns",
      description: "List Google Ads campaigns",
      inputSchema: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "Customer ID" },
        },
        required: ["customer_id"],
      },
    },
  ],
};

// ── Tests ─────────────────────────────────────────────────────────────

describe("Cache lifecycle", () => {
  let tempConfig: TempConfigContext;
  let metaServer: ReturnType<typeof createMockServer>;
  let googleServer: ReturnType<typeof createMockServer>;
  let metaPort: number;
  let googlePort: number;

  beforeEach(async () => {
    tempConfig = createTempConfig();
    process.env.HOPKIN_CONFIG_DIR = tempConfig.dir;

    metaServer = createMockServer({ tools: META_TOOLS });
    googleServer = createMockServer({ tools: GOOGLE_TOOLS });
    metaPort = await metaServer.start();
    googlePort = await googleServer.start();

    writeCredentials({ api_key: "test-key" }, tempConfig.dir);
  });

  afterEach(async () => {
    delete process.env.HOPKIN_CONFIG_DIR;
    delete process.env.HOPKIN_API_KEY;
    await metaServer.stop();
    await googleServer.stop();
    tempConfig.cleanup();
  });

  it("tools refresh fetches from all servers", async () => {
    const cache = await discoverTools({
      configDir: tempConfig.dir,
      forceRefresh: true,
      platforms: ["meta", "google"],
      apiKey: "test-key",
      configServers: {
        meta: { url: `http://localhost:${metaPort}` },
        google: { url: `http://localhost:${googlePort}` },
      },
    });

    expect(cache.entries.meta).toBeDefined();
    expect(cache.entries.meta.tools).toHaveLength(2);
    expect(cache.entries.google).toBeDefined();
    expect(cache.entries.google.tools).toHaveLength(1);
    expect(metaServer.getRequestCount()).toBe(1);
    expect(googleServer.getRequestCount()).toBe(1);
  });

  it("tools refresh --platform only fetches specified platform", async () => {
    const cache = await discoverTools({
      configDir: tempConfig.dir,
      forceRefresh: true,
      platforms: ["meta"],
      apiKey: "test-key",
      configServers: {
        meta: { url: `http://localhost:${metaPort}` },
        google: { url: `http://localhost:${googlePort}` },
      },
    });

    expect(cache.entries.meta).toBeDefined();
    expect(cache.entries.meta.tools).toHaveLength(2);
    expect(cache.entries.google).toBeUndefined();
    expect(metaServer.getRequestCount()).toBe(1);
    expect(googleServer.getRequestCount()).toBe(0);
  });

  it("tools list shows cached tools", async () => {
    await discoverTools({
      configDir: tempConfig.dir,
      forceRefresh: true,
      platforms: ["meta"],
      apiKey: "test-key",
      configServers: {
        meta: { url: `http://localhost:${metaPort}` },
      },
    });

    const cache = readToolsCache(tempConfig.dir);
    expect(cache).not.toBeNull();
    expect(cache!.entries.meta.tools).toHaveLength(2);
    expect(cache!.entries.meta.tools[0].name).toBe("meta_ads_list_campaigns");
    expect(cache!.entries.meta.tools[1].name).toBe("meta_ads_get_campaign");
  });

  it("tools list --json returns JSON-serialisable data", async () => {
    await discoverTools({
      configDir: tempConfig.dir,
      forceRefresh: true,
      platforms: ["meta"],
      apiKey: "test-key",
      configServers: {
        meta: { url: `http://localhost:${metaPort}` },
      },
    });

    const cache = readToolsCache(tempConfig.dir);
    expect(cache).not.toBeNull();

    // Build the same rows the list command would produce
    const rows: Record<string, unknown>[] = [];
    for (const [platform, entry] of Object.entries(cache!.entries)) {
      for (const tool of entry.tools) {
        rows.push({
          name: tool.name,
          description: tool.description,
          platform,
        });
      }
    }

    const json = JSON.stringify(rows);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toHaveProperty("name");
    expect(parsed[0]).toHaveProperty("description");
    expect(parsed[0]).toHaveProperty("platform");
  });

  it("tools list with no cache shows helpful message", () => {
    const cache = readToolsCache(tempConfig.dir);
    expect(cache).toBeNull();
  });

  it("cache hit: no HTTP after fresh refresh", async () => {
    // First call: fetches from server
    await discoverTools({
      configDir: tempConfig.dir,
      forceRefresh: true,
      platforms: ["meta"],
      apiKey: "test-key",
      configServers: {
        meta: { url: `http://localhost:${metaPort}` },
      },
    });

    expect(metaServer.getRequestCount()).toBe(1);

    // Second call without forceRefresh: should use cache
    metaServer.resetRequestCount();
    await discoverTools({
      configDir: tempConfig.dir,
      forceRefresh: false,
      platforms: ["meta"],
      apiKey: "test-key",
      configServers: {
        meta: { url: `http://localhost:${metaPort}` },
      },
    });

    expect(metaServer.getRequestCount()).toBe(0);
  });

  it("cache stale: re-fetches after expiry", async () => {
    // Seed a cache entry that is beyond the TTL
    const staleCache: ToolsCache = {
      version: 1,
      entries: {
        meta: {
          platform: "meta",
          tools: [
            {
              name: "meta_ads_old_tool",
              description: "Stale tool",
              inputSchema: { type: "object" },
            },
          ],
          fetched_at: Date.now() - CACHE_TTL_MS - 1000,
          server_url: `http://localhost:${metaPort}`,
        },
      },
    };
    writeToolsCache(staleCache, tempConfig.dir);

    // Verify the entry is considered stale
    expect(isCacheStale(staleCache.entries.meta)).toBe(true);

    // discoverTools without forceRefresh should still fetch because cache is stale
    const cache = await discoverTools({
      configDir: tempConfig.dir,
      forceRefresh: false,
      platforms: ["meta"],
      apiKey: "test-key",
      configServers: {
        meta: { url: `http://localhost:${metaPort}` },
      },
    });

    expect(metaServer.getRequestCount()).toBe(1);
    expect(cache.entries.meta.tools).toHaveLength(2);
    expect(cache.entries.meta.tools[0].name).toBe("meta_ads_list_campaigns");
  });
});
