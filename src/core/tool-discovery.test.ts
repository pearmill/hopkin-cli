import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  discoverTools,
  readToolsCache,
  writeToolsCache,
  isCacheStale,
  findTool,
} from "./tool-discovery.js";
import { CACHE_TTL_MS } from "../constants.js";
import type { ToolsCache, ToolsCacheEntry, MCPTool } from "../types.js";

const MOCK_TOOLS_META: MCPTool[] = [
  { name: "meta_ads_get_campaigns", description: "Get campaigns", inputSchema: { type: "object" } },
  { name: "meta_ads_create_campaign", description: "Create campaign", inputSchema: { type: "object" } },
];

const MOCK_TOOLS_GOOGLE: MCPTool[] = [
  { name: "google_ads_get_campaigns", description: "Get campaigns", inputSchema: { type: "object" } },
];

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "hopkin-test-"));
}

function freshCache(platforms: Record<string, { tools: MCPTool[]; serverUrl: string }>): ToolsCache {
  const entries: Record<string, ToolsCacheEntry> = {};
  for (const [platform, { tools, serverUrl }] of Object.entries(platforms)) {
    entries[platform] = {
      platform,
      tools,
      fetched_at: Date.now(),
      server_url: serverUrl,
    };
  }
  return { version: 1, entries };
}

function staleCache(platforms: Record<string, { tools: MCPTool[]; serverUrl: string }>): ToolsCache {
  const entries: Record<string, ToolsCacheEntry> = {};
  for (const [platform, { tools, serverUrl }] of Object.entries(platforms)) {
    entries[platform] = {
      platform,
      tools,
      fetched_at: Date.now() - CACHE_TTL_MS - 1000,
      server_url: serverUrl,
    };
  }
  return { version: 1, entries };
}

describe("tool-discovery", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    nock.cleanAll();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("readToolsCache / writeToolsCache", () => {
    it("returns null when cache file does not exist", () => {
      const result = readToolsCache(tmpDir);
      expect(result).toBeNull();
    });

    it("survives write/read round-trip", () => {
      const cache = freshCache({
        meta: { tools: MOCK_TOOLS_META, serverUrl: "https://meta.mcp.hopkin.ai" },
      });
      writeToolsCache(cache, tmpDir);
      const read = readToolsCache(tmpDir);
      expect(read).toEqual(cache);
    });

    it("returns null for corrupt cache file", () => {
      fs.writeFileSync(path.join(tmpDir, "tools-cache.json"), "NOT JSON{{{");
      const result = readToolsCache(tmpDir);
      expect(result).toBeNull();
    });
  });

  describe("isCacheStale", () => {
    it("returns false for fresh entry", () => {
      const entry: ToolsCacheEntry = {
        platform: "meta",
        tools: MOCK_TOOLS_META,
        fetched_at: Date.now(),
        server_url: "https://meta.mcp.hopkin.ai",
      };
      expect(isCacheStale(entry)).toBe(false);
    });

    it("returns true for stale entry", () => {
      const entry: ToolsCacheEntry = {
        platform: "meta",
        tools: MOCK_TOOLS_META,
        fetched_at: Date.now() - CACHE_TTL_MS - 1000,
        server_url: "https://meta.mcp.hopkin.ai",
      };
      expect(isCacheStale(entry)).toBe(true);
    });
  });

  describe("findTool", () => {
    it("returns correct tool and platform", () => {
      const cache = freshCache({
        meta: { tools: MOCK_TOOLS_META, serverUrl: "https://meta.mcp.hopkin.ai" },
        google: { tools: MOCK_TOOLS_GOOGLE, serverUrl: "https://google.mcp.hopkin.ai" },
      });
      const result = findTool("google_ads_get_campaigns", cache);
      expect(result).toEqual({
        tool: MOCK_TOOLS_GOOGLE[0],
        platform: "google",
        serverUrl: "https://google.mcp.hopkin.ai",
      });
    });

    it("returns null for unknown tool", () => {
      const cache = freshCache({
        meta: { tools: MOCK_TOOLS_META, serverUrl: "https://meta.mcp.hopkin.ai" },
      });
      const result = findTool("nonexistent_tool", cache);
      expect(result).toBeNull();
    });
  });

  describe("discoverTools", () => {
    function mockToolsList(platform: string, tools: MCPTool[]) {
      nock(`https://${platform}.mcp.hopkin.ai`)
        .post("/", (body: Record<string, unknown>) => body.method === "tools/list")
        .reply(200, { result: { tools } });
    }

    function mockAllPlatforms(overrides: Partial<Record<string, MCPTool[]>> = {}) {
      mockToolsList("meta", overrides.meta ?? MOCK_TOOLS_META);
      mockToolsList("google", overrides.google ?? MOCK_TOOLS_GOOGLE);
      mockToolsList("linkedin", overrides.linkedin ?? []);
      mockToolsList("reddit", overrides.reddit ?? []);
    }

    it("fetches from all servers when no cache exists", async () => {
      mockAllPlatforms();

      const result = await discoverTools({
        configDir: tmpDir,
        apiKey: "test-key",
      });

      expect(result.entries.meta.tools).toEqual(MOCK_TOOLS_META);
      expect(result.entries.google.tools).toEqual(MOCK_TOOLS_GOOGLE);
    });

    it("returns cached data without HTTP requests for fresh cache", async () => {
      const cache = freshCache({
        meta: { tools: MOCK_TOOLS_META, serverUrl: "https://meta.mcp.hopkin.ai" },
        google: { tools: MOCK_TOOLS_GOOGLE, serverUrl: "https://google.mcp.hopkin.ai" },
        linkedin: { tools: [], serverUrl: "https://linkedin.mcp.hopkin.ai" },
        reddit: { tools: [], serverUrl: "https://reddit.mcp.hopkin.ai" },
      });
      writeToolsCache(cache, tmpDir);

      // No nock setup - any HTTP request would throw
      const result = await discoverTools({
        configDir: tmpDir,
        apiKey: "test-key",
      });

      expect(result.entries.meta.tools).toEqual(MOCK_TOOLS_META);
      expect(result.entries.google.tools).toEqual(MOCK_TOOLS_GOOGLE);
    });

    it("refetches stale cache entries", async () => {
      const updatedTools: MCPTool[] = [
        { name: "meta_ads_get_campaigns_v2", description: "Get campaigns v2", inputSchema: { type: "object" } },
      ];
      const cache = staleCache({
        meta: { tools: MOCK_TOOLS_META, serverUrl: "https://meta.mcp.hopkin.ai" },
        google: { tools: MOCK_TOOLS_GOOGLE, serverUrl: "https://google.mcp.hopkin.ai" },
        linkedin: { tools: [], serverUrl: "https://linkedin.mcp.hopkin.ai" },
        reddit: { tools: [], serverUrl: "https://reddit.mcp.hopkin.ai" },
      });
      writeToolsCache(cache, tmpDir);

      mockAllPlatforms({ meta: updatedTools });

      const result = await discoverTools({
        configDir: tmpDir,
        apiKey: "test-key",
      });

      expect(result.entries.meta.tools).toEqual(updatedTools);
    });

    it("bypasses cache when forceRefresh is true", async () => {
      const cache = freshCache({
        meta: { tools: MOCK_TOOLS_META, serverUrl: "https://meta.mcp.hopkin.ai" },
        google: { tools: MOCK_TOOLS_GOOGLE, serverUrl: "https://google.mcp.hopkin.ai" },
        linkedin: { tools: [], serverUrl: "https://linkedin.mcp.hopkin.ai" },
        reddit: { tools: [], serverUrl: "https://reddit.mcp.hopkin.ai" },
      });
      writeToolsCache(cache, tmpDir);

      const updatedTools: MCPTool[] = [
        { name: "meta_ads_updated", description: "Updated", inputSchema: { type: "object" } },
      ];

      mockAllPlatforms({ meta: updatedTools });

      const result = await discoverTools({
        configDir: tmpDir,
        apiKey: "test-key",
        forceRefresh: true,
      });

      expect(result.entries.meta.tools).toEqual(updatedTools);
    });

    it("only refreshes specified platforms when platforms option provided", async () => {
      const cache = staleCache({
        meta: { tools: MOCK_TOOLS_META, serverUrl: "https://meta.mcp.hopkin.ai" },
        google: { tools: MOCK_TOOLS_GOOGLE, serverUrl: "https://google.mcp.hopkin.ai" },
        linkedin: { tools: [], serverUrl: "https://linkedin.mcp.hopkin.ai" },
        reddit: { tools: [], serverUrl: "https://reddit.mcp.hopkin.ai" },
      });
      writeToolsCache(cache, tmpDir);

      const updatedMetaTools: MCPTool[] = [
        { name: "meta_ads_new", description: "New", inputSchema: { type: "object" } },
      ];

      // Only meta should be fetched
      mockToolsList("meta", updatedMetaTools);

      const result = await discoverTools({
        configDir: tmpDir,
        apiKey: "test-key",
        platforms: ["meta"],
      });

      expect(result.entries.meta.tools).toEqual(updatedMetaTools);
      // google should still have stale cache data (not refetched)
      expect(result.entries.google.tools).toEqual(MOCK_TOOLS_GOOGLE);
    });

    it("treats corrupt cache file as miss and fetches fresh", async () => {
      fs.writeFileSync(path.join(tmpDir, "tools-cache.json"), "CORRUPT{{{");

      mockAllPlatforms();

      const result = await discoverTools({
        configDir: tmpDir,
        apiKey: "test-key",
      });

      expect(result.entries.meta.tools).toEqual(MOCK_TOOLS_META);
      expect(result.entries.google.tools).toEqual(MOCK_TOOLS_GOOGLE);
    });
  });
});
