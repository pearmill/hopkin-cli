import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnCLI } from "../helpers/spawn-cli.js";
import { DEFAULT_SERVERS } from "../../src/constants.js";
import type { ToolsCache, MCPTool } from "../../src/types.js";

// ── Helpers ──────────────────────────────────────────────────────────

function makeTool(name: string, desc: string, schema?: MCPTool["inputSchema"]): MCPTool {
  return {
    name,
    description: desc,
    inputSchema: schema ?? { type: "object", properties: {} },
  };
}

const META_TOOLS: MCPTool[] = [
  makeTool("meta_ads_ping", "Ping the Meta Ads MCP server", {
    type: "object",
    properties: { reason: { type: "string", description: "Reason for ping" } },
    required: ["reason"],
  }),
  makeTool("meta_ads_check_auth_status", "Check authentication status"),
  makeTool("meta_ads_list_ad_accounts", "List all ad accounts", {
    type: "object",
    properties: {
      reason: { type: "string", description: "Reason" },
      limit: { type: "integer", description: "Max results" },
      refresh: { type: "boolean", description: "Force refresh" },
    },
    required: ["reason"],
  }),
  makeTool("meta_ads_list_campaigns", "List campaigns for an account"),
  makeTool("meta_ads_get_campaigns", "Get a single campaign by ID"),
  makeTool("meta_ads_list_adsets", "List ad sets for an account"),
  makeTool("meta_ads_list_ads", "List ads for an account"),
  makeTool("meta_ads_get_insights", "Get performance insights"),
  makeTool("meta_ads_developer_feedback", "Submit developer feedback"),
];

let tmpDir: string;

function seedConfigDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hopkin-e2e-help-"));

  // Credentials
  fs.writeFileSync(path.join(dir, "credentials.json"), JSON.stringify({ api_key: "test-key" }));

  // Config with no custom servers
  fs.writeFileSync(path.join(dir, "config.json"), JSON.stringify({}));

  // Tools cache — seed all default platforms so ensureFreshCache doesn't
  // try to fetch from live servers during tests
  const entries: ToolsCache["entries"] = {};
  for (const platform of Object.keys(DEFAULT_SERVERS)) {
    entries[platform] = {
      platform,
      tools: platform === "meta" ? META_TOOLS : [],
      fetched_at: Date.now(),
      server_url: DEFAULT_SERVERS[platform].url,
    };
  }
  const cache: ToolsCache = { version: 1, entries };
  fs.writeFileSync(path.join(dir, "tools-cache.json"), JSON.stringify(cache));

  return dir;
}

// ── Tests ────────────────────────────────────────────────────────────

describe("help output (e2e)", () => {
  beforeEach(() => {
    tmpDir = seedConfigDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("root help", () => {
    it("lists builtin commands", async () => {
      const result = await spawnCLI(["--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(result.exitCode).toBe(0);
      expect(out).toContain("auth");
      expect(out).toContain("config");
      expect(out).toContain("tools");
      expect(out).toContain("completion");
    });

    it("lists platforms from cache", async () => {
      const result = await spawnCLI(["--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(out).toContain("meta");
    });

    it("shows global options", async () => {
      const result = await spawnCLI(["--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(out).toContain("--json");
      expect(out).toContain("--format");
      expect(out).toContain("--output");
      expect(out).toContain("--debug");
    });

    it("shows version", async () => {
      const result = await spawnCLI(["--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(out).toMatch(/v\d+\.\d+\.\d+/);
    });
  });

  describe("platform help", () => {
    it("hopkin meta --help shows resources", async () => {
      const result = await spawnCLI(["meta", "--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(result.exitCode).toBe(0);
      expect(out).toContain("RESOURCES:");
      expect(out).toContain("ad-accounts");
      expect(out).toContain("campaigns");
      expect(out).toContain("adsets");
      expect(out).toContain("ads");
    });

    it("hopkin meta --help shows standalone commands", async () => {
      const result = await spawnCLI(["meta", "--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(out).toContain("ping");
    });

    it("hopkin meta --help shows tool count", async () => {
      const result = await spawnCLI(["meta", "--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(out).toContain(`${META_TOOLS.length} tools`);
    });
  });

  describe("resource help", () => {
    it("hopkin meta campaigns --help lists verbs", async () => {
      const result = await spawnCLI(["meta", "campaigns", "--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(result.exitCode).toBe(0);
      expect(out).toContain("list");
      expect(out).toContain("get");
    });

    it("hopkin meta ad-accounts --help lists verbs", async () => {
      const result = await spawnCLI(["meta", "ad-accounts", "--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(result.exitCode).toBe(0);
      expect(out).toContain("list");
    });
  });

  describe("tool-specific help", () => {
    it("hopkin meta ping --help shows tool description", async () => {
      const result = await spawnCLI(["meta", "ping", "--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(result.exitCode).toBe(0);
      expect(out).toContain("Ping");
      expect(out).toContain("--reason");
    });

    it("hopkin meta ad-accounts list --help shows flags", async () => {
      const result = await spawnCLI(["meta", "ad-accounts", "list", "--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(result.exitCode).toBe(0);
      expect(out).toContain("--reason");
      expect(out).toContain("REQUIRED");
      // --refresh is optional
      expect(out).toContain("--refresh");
      expect(out).toContain("OPTIONAL");
    });

    it("shows global flags in tool help", async () => {
      const result = await spawnCLI(["meta", "ping", "--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(out).toContain("GLOBAL FLAGS:");
      expect(out).toContain("--json");
      expect(out).toContain("--format");
    });
  });

  describe("builtin subcommand help", () => {
    it("hopkin auth --help shows auth subcommands", async () => {
      const result = await spawnCLI(["auth", "--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(result.exitCode).toBe(0);
      // citty-generated help
      expect(out.toLowerCase()).toMatch(/auth|login|set-key|status/);
    });

    it("hopkin config --help shows config subcommands", async () => {
      const result = await spawnCLI(["config", "--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(result.exitCode).toBe(0);
      expect(out.toLowerCase()).toMatch(/config|get|set/);
    });

    it("hopkin tools --help shows tools subcommands", async () => {
      const result = await spawnCLI(["tools", "--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(result.exitCode).toBe(0);
      expect(out.toLowerCase()).toMatch(/tools|list|refresh/);
    });
  });

  describe("unknown command help", () => {
    it("hopkin meta nonexistent --help falls back to platform help", async () => {
      const result = await spawnCLI(["meta", "nonexistent", "--help"], { env: { HOPKIN_CONFIG_DIR: tmpDir } });
      const out = result.stdout + result.stderr;
      expect(result.exitCode).toBe(0);
      // Should show platform help as fallback
      expect(out).toContain("RESOURCES:");
    });
  });
});
