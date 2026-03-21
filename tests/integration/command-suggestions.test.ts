import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import http from "node:http";
import { createTempConfig, type TempConfigContext } from "../helpers/temp-config.js";
import { routePlatformCommand } from "../../src/commands/platform-router.js";
import { writeToolsCache } from "../../src/core/tool-discovery.js";
import { writeCredentials } from "../../src/auth/credentials.js";
import { CommandNotFoundError } from "../../src/errors.js";
import type { ToolsCache, MCPTool } from "../../src/types.js";

// ── Helpers ──────────────────────────────────────────────────────────

function makeTool(name: string): MCPTool {
  return { name, description: `Desc for ${name}`, inputSchema: { type: "object", properties: {} } };
}

const GOOGLE_TOOLS = [
  makeTool("google_ads_ping"),
  makeTool("google_ads_list_accounts"),
  makeTool("google_ads_list_campaigns"),
  makeTool("google_ads_list_ad_groups"),
  makeTool("google_ads_list_ads"),
  makeTool("google_ads_get_insights"),
  makeTool("google_ads_get_account_summary"),
  makeTool("google_ads_list_mcc_child_accounts"),
];

function createMockServer() {
  const server = http.createServer((req, res) => {
    const body: Buffer[] = [];
    req.on("data", (chunk: Buffer) => body.push(chunk));
    req.on("end", () => {
      const parsed = JSON.parse(Buffer.concat(body).toString());
      res.writeHead(200, { "Content-Type": "application/json" });
      if (parsed.method === "tools/list") {
        res.end(JSON.stringify({ result: { tools: GOOGLE_TOOLS } }));
      } else {
        res.end(JSON.stringify({ result: { content: [{ type: "text", text: "[]" }] } }));
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

describe("Command suggestions on unknown commands", () => {
  let tempConfig: TempConfigContext;
  let mockServer: ReturnType<typeof createMockServer>;
  let port: number;

  beforeEach(async () => {
    tempConfig = createTempConfig();
    process.env.HOPKIN_CONFIG_DIR = tempConfig.dir;
    writeCredentials({ api_key: "test-key" }, tempConfig.dir);

    mockServer = createMockServer();
    port = await mockServer.start();

    const configData = {
      servers: { google: { url: `http://localhost:${port}` } },
    };
    fs.writeFileSync(tempConfig.configPath, JSON.stringify(configData));

    // Pre-populate cache
    const cache: ToolsCache = {
      version: 1,
      entries: {
        google: {
          platform: "google",
          tools: GOOGLE_TOOLS,
          fetched_at: Date.now(),
          server_url: `http://localhost:${port}`,
        },
      },
    };
    writeToolsCache(cache, tempConfig.dir);
  });

  afterEach(async () => {
    delete process.env.HOPKIN_CONFIG_DIR;
    delete process.env.HOPKIN_API_KEY;
    if (mockServer) await mockServer.stop();
    tempConfig.cleanup();
  });

  it("suggests 'accounts' when user types 'ad-accounts' (google)", async () => {
    try {
      await routePlatformCommand(
        ["google", "ad-accounts", "list", "--reason", "test"],
        { configDir: tempConfig.dir },
      );
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(CommandNotFoundError);
      const e = err as CommandNotFoundError;
      expect(e.hint).toContain("Did you mean?");
      expect(e.hint).toContain("accounts");
    }
  });

  it("suggests similar commands for partial matches", async () => {
    // "campaign" (singular) should match "campaigns" via the partial scoring
    try {
      await routePlatformCommand(
        ["google", "campaign", "--reason", "test"],
        { configDir: tempConfig.dir },
      );
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(CommandNotFoundError);
      const e = err as CommandNotFoundError;
      expect(e.hint).toContain("Did you mean?");
      expect(e.hint).toContain("campaigns");
    }
  });

  it("does not suggest when no matches at all", async () => {
    try {
      await routePlatformCommand(
        ["google", "zzzzz", "--reason", "test"],
        { configDir: tempConfig.dir },
      );
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(CommandNotFoundError);
      const e = err as CommandNotFoundError;
      expect(e.hint).not.toContain("Did you mean?");
      expect(e.hint).toContain("hopkin tools list");
    }
  });

  it("auto-refreshes cache before suggesting (no cache present)", async () => {
    // Remove cache so it must auto-refresh
    fs.unlinkSync(tempConfig.cachePath);

    try {
      await routePlatformCommand(
        ["google", "ad-accounts", "--reason", "test"],
        { configDir: tempConfig.dir },
      );
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(CommandNotFoundError);
      const e = err as CommandNotFoundError;
      // Should still have suggestions after auto-refresh
      expect(e.hint).toContain("Did you mean?");
      expect(e.hint).toContain("accounts");
    }
  });

  it("throws CommandNotFoundError (not raw Error) with no refresh hint", async () => {
    try {
      await routePlatformCommand(
        ["google", "nonexistent", "--reason", "test"],
        { configDir: tempConfig.dir },
      );
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(CommandNotFoundError);
      const e = err as CommandNotFoundError;
      // Should NOT tell user to manually refresh
      expect(e.hint).not.toContain("Run `hopkin tools refresh`");
    }
  });

  it("throws on missing subcommand with usage hint", async () => {
    try {
      await routePlatformCommand(
        ["google"],
        { configDir: tempConfig.dir },
      );
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(CommandNotFoundError);
      const e = err as CommandNotFoundError;
      expect(e.hint).toContain("Usage:");
    }
  });
});
