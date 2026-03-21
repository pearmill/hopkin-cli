import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "node:http";
import { createTempConfig, type TempConfigContext } from "../helpers/temp-config.js";
import { routePlatformCommand } from "../../src/commands/platform-router.js";
import { writeToolsCache } from "../../src/core/tool-discovery.js";
import { writeCredentials } from "../../src/auth/credentials.js";
import type { MCPToolCallResponse, ToolsCache, MCPTool } from "../../src/types.js";

// ── Mock server ──────────────────────────────────────────────────────

const ACCOUNT_TOOL: MCPTool = {
  name: "meta_ads_list_ad_accounts",
  description: "List ad accounts",
  inputSchema: {
    type: "object",
    properties: {
      reason: { type: "string", description: "Reason" },
      limit: { type: "integer", description: "Limit" },
    },
    required: ["reason"],
  },
};

const STRUCTURED_ACCOUNTS: MCPToolCallResponse = {
  content: [
    {
      type: "text",
      text: "## Ad Accounts (2 total)\n\n### Acme Corp\n- **Account ID**: 111\n- **Status**: Active",
    },
  ],
  structuredContent: {
    data: [
      { id: "act_111", account_id: "111", name: "Acme Corp", currency: "USD", account_status: 1 },
      { id: "act_222", account_id: "222", name: "Beta Inc", currency: "EUR", account_status: 1 },
    ],
    count: 2,
    cached: false,
    synced_at: "2026-03-20T00:00:00.000Z",
  },
};

const STRUCTURED_SINGLE: MCPToolCallResponse = {
  content: [{ type: "text", text: "Ping successful" }],
  structuredContent: {
    status: "ok",
    latency_ms: 42,
  },
};

const TEXT_ONLY_RESPONSE: MCPToolCallResponse = {
  content: [{ type: "text", text: "# Hello\n\nThis is markdown" }],
};

// Simulates TikTok-style response: no structuredContent, JSON text with nested data array
const TIKTOK_STYLE_RESPONSE: MCPToolCallResponse = {
  content: [
    {
      type: "text",
      text: JSON.stringify({
        advertisers: [
          { advertiser_id: "111", name: "Acme Corp", status: "ACTIVE" },
          { advertiser_id: "222", name: "Beta Inc", status: "PAUSED" },
        ],
        pagination: { hasMore: false, cursor: "" },
        cached: true,
        synced_at: "2026-03-21T19:24:28.000Z",
        refreshing: true,
      }),
    },
  ],
};

function createMockServer(responses: Map<string, MCPToolCallResponse>) {
  const server = http.createServer((req, res) => {
    const body: Buffer[] = [];
    req.on("data", (chunk: Buffer) => body.push(chunk));
    req.on("end", () => {
      const parsed = JSON.parse(Buffer.concat(body).toString());
      res.writeHead(200, { "Content-Type": "application/json" });

      if (parsed.method === "tools/list") {
        res.end(JSON.stringify({ result: { tools: [ACCOUNT_TOOL, { name: "meta_ads_ping", description: "Ping", inputSchema: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] } }] } }));
      } else if (parsed.method === "tools/call") {
        const toolName = parsed.params.name as string;
        const response = responses.get(toolName) ?? { content: [{ type: "text", text: "[]" }] };
        res.end(JSON.stringify({ result: response }));
      }
    });
  });

  return {
    server,
    async start(): Promise<number> {
      return new Promise((resolve) => {
        server.listen(0, () => {
          const addr = server.address();
          if (addr && typeof addr === "object") resolve(addr.port);
        });
      });
    },
    async stop(): Promise<void> {
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("structuredContent response handling", () => {
  let tempConfig: TempConfigContext;
  let mockServer: ReturnType<typeof createMockServer>;
  let port: number;
  let captured: string;
  let originalWrite: typeof process.stdout.write;
  let originalIsTTY: boolean | undefined;

  function setupCache() {
    const cache: ToolsCache = {
      version: 1,
      entries: {
        meta: {
          platform: "meta",
          tools: [
            ACCOUNT_TOOL,
            { name: "meta_ads_ping", description: "Ping", inputSchema: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] } },
          ],
          fetched_at: Date.now(),
          server_url: `http://localhost:${port}`,
        },
      },
    };
    writeToolsCache(cache, tempConfig.dir);
  }

  beforeEach(async () => {
    tempConfig = createTempConfig();
    process.env.HOPKIN_CONFIG_DIR = tempConfig.dir;
    writeCredentials({ api_key: "test-key" }, tempConfig.dir);

    captured = "";
    originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => {
      captured += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
      return true;
    }) as typeof process.stdout.write;

    originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });
  });

  afterEach(async () => {
    process.stdout.write = originalWrite;
    Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, configurable: true });
    delete process.env.HOPKIN_CONFIG_DIR;
    if (mockServer) await mockServer.stop();
    tempConfig.cleanup();
  });

  it("uses structuredContent.data array for --json output", async () => {
    mockServer = createMockServer(new Map([
      ["meta_ads_list_ad_accounts", STRUCTURED_ACCOUNTS],
    ]));
    port = await mockServer.start();
    setupCache();

    await routePlatformCommand(
      ["meta", "ad-accounts", "list", "--reason", "test"],
      { json: true, configDir: tempConfig.dir },
    );

    const output = JSON.parse(captured.trim());
    expect(output).toHaveLength(2);
    expect(output[0].id).toBe("act_111");
    expect(output[0].name).toBe("Acme Corp");
    expect(output[1].id).toBe("act_222");
  });

  it("uses structuredContent.data for --format csv output", async () => {
    mockServer = createMockServer(new Map([
      ["meta_ads_list_ad_accounts", STRUCTURED_ACCOUNTS],
    ]));
    port = await mockServer.start();
    setupCache();

    await routePlatformCommand(
      ["meta", "ad-accounts", "list", "--reason", "test"],
      { format: "csv", configDir: tempConfig.dir },
    );

    const lines = captured.trim().split("\n");
    // Header + 2 data rows
    expect(lines.length).toBe(3);
    expect(lines[0]).toContain("id");
    expect(lines[0]).toContain("name");
    expect(lines[1]).toContain("act_111");
    expect(lines[2]).toContain("act_222");
  });

  it("uses structuredContent.data for --format tsv output", async () => {
    mockServer = createMockServer(new Map([
      ["meta_ads_list_ad_accounts", STRUCTURED_ACCOUNTS],
    ]));
    port = await mockServer.start();
    setupCache();

    await routePlatformCommand(
      ["meta", "ad-accounts", "list", "--reason", "test"],
      { format: "tsv", configDir: tempConfig.dir },
    );

    const lines = captured.trim().split("\n");
    expect(lines.length).toBe(3);
    // TSV uses tabs
    expect(lines[0]).toContain("\t");
    expect(lines[1]).toContain("act_111");
  });

  it("wraps non-array structuredContent as single record", async () => {
    mockServer = createMockServer(new Map([
      ["meta_ads_ping", STRUCTURED_SINGLE],
    ]));
    port = await mockServer.start();
    setupCache();

    await routePlatformCommand(
      ["meta", "ping", "--reason", "test"],
      { json: true, configDir: tempConfig.dir },
    );

    const output = JSON.parse(captured.trim());
    expect(output).toHaveLength(1);
    expect(output[0].status).toBe("ok");
    expect(output[0].latency_ms).toBe(42);
  });

  it("falls back to raw text when no structuredContent", async () => {
    mockServer = createMockServer(new Map([
      ["meta_ads_ping", TEXT_ONLY_RESPONSE],
    ]));
    port = await mockServer.start();
    setupCache();

    await routePlatformCommand(
      ["meta", "ping", "--reason", "test"],
      { configDir: tempConfig.dir },
    );

    // Should output the markdown text directly
    expect(captured).toContain("# Hello");
    expect(captured).toContain("This is markdown");
  });

  it("structuredContent takes priority over content text", async () => {
    // Response has BOTH markdown text AND structuredContent
    mockServer = createMockServer(new Map([
      ["meta_ads_list_ad_accounts", STRUCTURED_ACCOUNTS],
    ]));
    port = await mockServer.start();
    setupCache();

    await routePlatformCommand(
      ["meta", "ad-accounts", "list", "--reason", "test"],
      { json: true, configDir: tempConfig.dir },
    );

    const output = JSON.parse(captured.trim());
    // Should use structured data, not the markdown
    expect(output[0].id).toBe("act_111");
    // Should NOT contain markdown
    expect(captured).not.toContain("##");
  });

  it("extracts nested data array from text-only JSON response (TikTok-style)", async () => {
    const tiktokTool: MCPTool = {
      name: "tiktok_ads_list_advertisers",
      description: "List advertisers",
      inputSchema: {
        type: "object",
        properties: { reason: { type: "string" } },
        required: ["reason"],
      },
    };

    mockServer = createMockServer(new Map([
      ["tiktok_ads_list_advertisers", TIKTOK_STYLE_RESPONSE],
    ]));
    port = await mockServer.start();

    // Write a cache with the tiktok tool
    const tiktokCache: ToolsCache = {
      version: 1,
      entries: {
        tiktok: {
          platform: "tiktok",
          tools: [tiktokTool],
          fetched_at: Date.now(),
          server_url: `http://localhost:${port}`,
        },
      },
    };
    writeToolsCache(tiktokCache, tempConfig.dir);

    await routePlatformCommand(
      ["tiktok", "advertisers", "list", "--reason", "test"],
      { json: true, configDir: tempConfig.dir },
    );

    const output = JSON.parse(captured.trim());
    // Should extract the advertisers array, not wrap the whole object
    expect(output).toHaveLength(2);
    expect(output[0].advertiser_id).toBe("111");
    expect(output[0].name).toBe("Acme Corp");
    expect(output[1].advertiser_id).toBe("222");
    // Should NOT contain metadata fields
    expect(output[0].pagination).toBeUndefined();
    expect(output[0].cached).toBeUndefined();
  });

  it("--fields filters structuredContent output", async () => {
    mockServer = createMockServer(new Map([
      ["meta_ads_list_ad_accounts", STRUCTURED_ACCOUNTS],
    ]));
    port = await mockServer.start();
    setupCache();

    await routePlatformCommand(
      ["meta", "ad-accounts", "list", "--reason", "test"],
      { json: true, fields: "id,name", configDir: tempConfig.dir },
    );

    const output = JSON.parse(captured.trim());
    expect(output[0]).toEqual({ id: "act_111", name: "Acme Corp" });
    expect(output[0].currency).toBeUndefined();
  });
});
