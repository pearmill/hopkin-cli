import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import http from "node:http";
import { createTempConfig, type TempConfigContext } from "../helpers/temp-config.js";
import { routePlatformCommand } from "../../src/commands/platform-router.js";
import { writeToolsCache } from "../../src/core/tool-discovery.js";
import { writeCredentials } from "../../src/auth/credentials.js";
import type { MCPToolsListResponse, MCPToolCallResponse, ToolsCache } from "../../src/types.js";

// ── Helpers ───────────────────────────────────────────────────────────

interface DynamicMockOptions {
  tools?: MCPToolsListResponse;
  callHandler?: (params: { name: string; arguments: Record<string, unknown> }) => MCPToolCallResponse;
  callResponse?: MCPToolCallResponse;
  errorCode?: number;
}

function createDynamicMockServer(options: DynamicMockOptions = {}) {
  const server = http.createServer((req, res) => {
    if (options.errorCode) {
      res.writeHead(options.errorCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Mock error ${options.errorCode}` }));
      return;
    }

    const body: Buffer[] = [];
    req.on("data", (chunk: Buffer) => body.push(chunk));
    req.on("end", () => {
      const parsed = JSON.parse(Buffer.concat(body).toString());
      res.writeHead(200, { "Content-Type": "application/json" });

      if (parsed.method === "tools/list") {
        const toolsResult = options.tools ?? { tools: [] };
        res.end(JSON.stringify({ result: toolsResult }));
      } else if (parsed.method === "tools/call") {
        if (options.callHandler) {
          const callResult = options.callHandler(parsed.params);
          res.end(JSON.stringify({ result: callResult }));
        } else {
          res.end(
            JSON.stringify({
              result: options.callResponse ?? {
                content: [{ type: "text", text: "[]" }],
              },
            }),
          );
        }
      } else {
        res.end(JSON.stringify({ error: "Unknown method" }));
      }
    });
  });

  return {
    server,
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

const MOCK_TOOLS: MCPToolsListResponse = {
  tools: [
    {
      name: "meta_ads_list_campaigns",
      description: "List campaigns",
      inputSchema: {
        type: "object",
        properties: {
          account_id: { type: "string", description: "Ad account ID" },
          status: { type: "string", description: "Filter by status", enum: ["ACTIVE", "PAUSED"] },
        },
        required: ["account_id"],
      },
    },
    {
      name: "meta_ads_get_campaigns",
      description: "Get a campaign by ID",
      inputSchema: {
        type: "object",
        properties: {
          account_id: { type: "string", description: "Ad account ID" },
          campaign_id: { type: "string", description: "Campaign ID" },
        },
        required: ["account_id", "campaign_id"],
      },
    },
  ],
};

const MOCK_CAMPAIGNS = [
  { id: "1", name: "Summer Sale", status: "ACTIVE" },
  { id: "2", name: "Winter Promo", status: "PAUSED" },
];

// ── Tests ─────────────────────────────────────────────────────────────

describe("Command pipeline integration", () => {
  let tempConfig: TempConfigContext;
  let mockServer: ReturnType<typeof createDynamicMockServer>;
  let port: number;
  let captured: string;
  let originalWrite: typeof process.stdout.write;
  let originalIsTTY: boolean | undefined;

  beforeEach(async () => {
    tempConfig = createTempConfig();
    process.env.HOPKIN_CONFIG_DIR = tempConfig.dir;

    // Capture stdout
    captured = "";
    originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => {
      captured += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
      return true;
    }) as typeof process.stdout.write;

    // Default to non-TTY so format defaults to JSON
    originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });
  });

  afterEach(async () => {
    process.stdout.write = originalWrite;
    Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, configurable: true });
    delete process.env.HOPKIN_CONFIG_DIR;
    delete process.env.HOPKIN_API_KEY;
    if (mockServer) {
      await mockServer.stop();
    }
    tempConfig.cleanup();
  });

  it("discover tools -> resolve command -> execute -> format output", async () => {
    mockServer = createDynamicMockServer({
      tools: MOCK_TOOLS,
      callResponse: {
        content: [{ type: "text", text: JSON.stringify(MOCK_CAMPAIGNS) }],
      },
    });
    port = await mockServer.start();

    // Seed credentials
    writeCredentials({ api_key: "test-key-123" }, tempConfig.dir);

    // Pre-populate cache so it finds the tool
    const cache: ToolsCache = {
      version: 1,
      entries: {
        meta: {
          platform: "meta",
          tools: MOCK_TOOLS.tools,
          fetched_at: Date.now(),
          server_url: `http://localhost:${port}`,
        },
      },
    };
    writeToolsCache(cache, tempConfig.dir);

    await routePlatformCommand(
      ["meta", "campaigns", "list", "--account", "act_123"],
      { configDir: tempConfig.dir },
    );

    const output = JSON.parse(captured.trim());
    expect(output).toEqual(MOCK_CAMPAIGNS);
  });

  it("tool not in cache -> auto-refresh -> execute succeeds", async () => {
    mockServer = createDynamicMockServer({
      tools: MOCK_TOOLS,
      callResponse: {
        content: [{ type: "text", text: JSON.stringify(MOCK_CAMPAIGNS) }],
      },
    });
    port = await mockServer.start();

    // Set API key via env
    process.env.HOPKIN_API_KEY = "test-key-456";

    // Write config with custom server pointing to mock
    const configData = {
      servers: {
        meta: { url: `http://localhost:${port}` },
      },
    };
    fs.writeFileSync(tempConfig.configPath, JSON.stringify(configData));

    // Write a stale cache that has the correct server URL but a different tool
    // (not the one we're looking for), so findTool fails and triggers auto-refresh
    const staleCache: ToolsCache = {
      version: 1,
      entries: {
        meta: {
          platform: "meta",
          tools: [
            {
              name: "meta_ads_list_adsets",
              description: "List ad sets",
              inputSchema: { type: "object", properties: {} },
            },
          ],
          fetched_at: 0, // epoch = stale
          server_url: `http://localhost:${port}`,
        },
      },
    };
    writeToolsCache(staleCache, tempConfig.dir);

    await routePlatformCommand(
      ["meta", "campaigns", "list", "--account", "act_123"],
      { configDir: tempConfig.dir },
    );

    const output = JSON.parse(captured.trim());
    expect(output).toEqual(MOCK_CAMPAIGNS);

    // Verify cache was refreshed with new tools
    const cacheRaw = fs.readFileSync(tempConfig.cachePath, "utf-8");
    const cache = JSON.parse(cacheRaw);
    expect(cache.entries.meta).toBeDefined();
    expect(cache.entries.meta.tools).toHaveLength(2);
  });

  it("auth error -> proper exit code", async () => {
    mockServer = createDynamicMockServer({
      tools: MOCK_TOOLS,
      errorCode: 401,
    });
    port = await mockServer.start();

    process.env.HOPKIN_API_KEY = "bad-key";

    // Pre-populate cache
    const cache: ToolsCache = {
      version: 1,
      entries: {
        meta: {
          platform: "meta",
          tools: MOCK_TOOLS.tools,
          fetched_at: Date.now(),
          server_url: `http://localhost:${port}`,
        },
      },
    };
    writeToolsCache(cache, tempConfig.dir);

    try {
      await routePlatformCommand(
        ["meta", "campaigns", "list", "--account", "act_123"],
        { configDir: tempConfig.dir },
      );
      expect.fail("Should have thrown");
    } catch (err: unknown) {
      const hopkinErr = err as { exitCode: number; name: string };
      expect(hopkinErr.name).toBe("AuthError");
      expect(hopkinErr.exitCode).toBe(2);
    }
  });

  it("--json flag produces JSON output", async () => {
    mockServer = createDynamicMockServer({
      tools: MOCK_TOOLS,
      callResponse: {
        content: [{ type: "text", text: JSON.stringify(MOCK_CAMPAIGNS) }],
      },
    });
    port = await mockServer.start();

    writeCredentials({ api_key: "test-key-789" }, tempConfig.dir);

    const cache: ToolsCache = {
      version: 1,
      entries: {
        meta: {
          platform: "meta",
          tools: MOCK_TOOLS.tools,
          fetched_at: Date.now(),
          server_url: `http://localhost:${port}`,
        },
      },
    };
    writeToolsCache(cache, tempConfig.dir);

    // Force TTY mode so default would be table, then --json overrides
    Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });

    await routePlatformCommand(
      ["meta", "campaigns", "list", "--account", "act_123"],
      { json: true, configDir: tempConfig.dir },
    );

    // Should be valid JSON
    const output = JSON.parse(captured.trim());
    expect(output).toEqual(MOCK_CAMPAIGNS);
  });

  it("--all flag paginates through multiple pages", async () => {
    const page1Data = [{ id: "1", name: "Campaign A" }];
    const page2Data = [{ id: "2", name: "Campaign B" }];
    const page3Data = [{ id: "3", name: "Campaign C" }];

    let callCount = 0;

    mockServer = createDynamicMockServer({
      tools: MOCK_TOOLS,
      callHandler: (params) => {
        callCount++;
        const cursor = params.arguments.cursor as string | undefined;

        if (!cursor) {
          return {
            content: [{ type: "text", text: JSON.stringify(page1Data) }],
            _meta: { cursor: "page2", has_more: true },
          };
        } else if (cursor === "page2") {
          return {
            content: [{ type: "text", text: JSON.stringify(page2Data) }],
            _meta: { cursor: "page3", has_more: true },
          };
        } else {
          return {
            content: [{ type: "text", text: JSON.stringify(page3Data) }],
            _meta: { has_more: false },
          };
        }
      },
    });
    port = await mockServer.start();

    writeCredentials({ api_key: "test-key-pg" }, tempConfig.dir);

    const cache: ToolsCache = {
      version: 1,
      entries: {
        meta: {
          platform: "meta",
          tools: MOCK_TOOLS.tools,
          fetched_at: Date.now(),
          server_url: `http://localhost:${port}`,
        },
      },
    };
    writeToolsCache(cache, tempConfig.dir);

    await routePlatformCommand(
      ["meta", "campaigns", "list", "--account", "act_123"],
      { all: true, json: true, configDir: tempConfig.dir },
    );

    // The streamed JSON output should contain all items
    const output = JSON.parse(captured);
    expect(output).toEqual([...page1Data, ...page2Data, ...page3Data]);
    expect(callCount).toBe(3);
  });
});
