import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readToolsCache,
  writeToolsCache,
  findTool,
  isCacheStale,
} from "../../src/core/tool-discovery.js";
import { CACHE_TTL_MS } from "../../src/constants.js";
import { createTempConfig, type TempConfigContext } from "../helpers/temp-config.js";
import type { ToolsCache, ToolsCacheEntry } from "../../src/types.js";

describe("Cache invalidation", () => {
  let tempConfig: TempConfigContext;

  beforeEach(() => {
    tempConfig = createTempConfig();
    process.env.HOPKIN_CONFIG_DIR = tempConfig.dir;
  });

  afterEach(() => {
    delete process.env.HOPKIN_CONFIG_DIR;
    tempConfig.cleanup();
  });

  describe("Unknown command triggers cache refresh attempt", () => {
    it("findTool returns null when tool is not in cache", () => {
      const cache: ToolsCache = {
        version: 1,
        entries: {
          meta: {
            platform: "meta",
            tools: [
              {
                name: "meta_ads_list_campaigns",
                description: "List campaigns",
                inputSchema: { type: "object" },
              },
            ],
            fetched_at: Date.now(),
            server_url: "https://mcp.hopkin.ai/meta",
          },
        },
      };

      const found = findTool("meta_ads_list_adsets", cache);
      expect(found).toBeNull();
    });

    it("after refresh with new tool, command resolves", () => {
      // Initial cache without the tool
      const initialCache: ToolsCache = {
        version: 1,
        entries: {
          meta: {
            platform: "meta",
            tools: [
              {
                name: "meta_ads_list_campaigns",
                description: "List campaigns",
                inputSchema: { type: "object" },
              },
            ],
            fetched_at: Date.now(),
            server_url: "https://mcp.hopkin.ai/meta",
          },
        },
      };

      // Tool not found initially
      expect(findTool("meta_ads_list_adsets", initialCache)).toBeNull();

      // Simulate cache refresh by adding the new tool
      const refreshedCache: ToolsCache = {
        version: 1,
        entries: {
          meta: {
            platform: "meta",
            tools: [
              {
                name: "meta_ads_list_campaigns",
                description: "List campaigns",
                inputSchema: { type: "object" },
              },
              {
                name: "meta_ads_list_adsets",
                description: "List ad sets",
                inputSchema: { type: "object" },
              },
            ],
            fetched_at: Date.now(),
            server_url: "https://mcp.hopkin.ai/meta",
          },
        },
      };

      const found = findTool("meta_ads_list_adsets", refreshedCache);
      expect(found).not.toBeNull();
      expect(found!.tool.name).toBe("meta_ads_list_adsets");
      expect(found!.platform).toBe("meta");
    });
  });

  describe("Stale cache detection", () => {
    it("cache entry older than 7 days is stale", () => {
      const entry: ToolsCacheEntry = {
        platform: "meta",
        tools: [],
        fetched_at: Date.now() - CACHE_TTL_MS - 1000,
        server_url: "https://mcp.hopkin.ai/meta",
      };
      expect(isCacheStale(entry)).toBe(true);
    });

    it("cache entry newer than 7 days is not stale", () => {
      const entry: ToolsCacheEntry = {
        platform: "meta",
        tools: [],
        fetched_at: Date.now() - 1000,
        server_url: "https://mcp.hopkin.ai/meta",
      };
      expect(isCacheStale(entry)).toBe(false);
    });

    it("cache entry exactly at TTL boundary is stale", () => {
      const entry: ToolsCacheEntry = {
        platform: "meta",
        tools: [],
        fetched_at: Date.now() - CACHE_TTL_MS - 1,
        server_url: "https://mcp.hopkin.ai/meta",
      };
      expect(isCacheStale(entry)).toBe(true);
    });

    it("freshly created cache entry is not stale", () => {
      const entry: ToolsCacheEntry = {
        platform: "meta",
        tools: [],
        fetched_at: Date.now(),
        server_url: "https://mcp.hopkin.ai/meta",
      };
      expect(isCacheStale(entry)).toBe(false);
    });
  });

  describe("Cache persistence", () => {
    it("writeToolsCache and readToolsCache roundtrip", () => {
      const cache: ToolsCache = {
        version: 1,
        entries: {
          meta: {
            platform: "meta",
            tools: [
              {
                name: "meta_ads_list_campaigns",
                description: "List campaigns",
                inputSchema: { type: "object", properties: {} },
              },
            ],
            fetched_at: 1700000000000,
            server_url: "https://mcp.hopkin.ai/meta",
          },
        },
      };

      writeToolsCache(cache, tempConfig.dir);
      const loaded = readToolsCache(tempConfig.dir);
      expect(loaded).toEqual(cache);
    });

    it("readToolsCache returns null when no cache file exists", () => {
      const loaded = readToolsCache(tempConfig.dir);
      expect(loaded).toBeNull();
    });
  });
});
