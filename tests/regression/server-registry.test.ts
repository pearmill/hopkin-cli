import { describe, it, expect } from "vitest";
import { DEFAULT_SERVERS } from "../../src/constants.js";
import {
  getServers,
  getServerUrl,
  getPlatforms,
} from "../../src/config/servers.js";

describe("Server registry", () => {
  describe("Default servers", () => {
    it("meta is present in defaults", () => {
      expect(DEFAULT_SERVERS.meta).toBeDefined();
      expect(DEFAULT_SERVERS.meta.url).toBe("https://meta.mcp.hopkin.ai");
    });

    it("google is present in defaults", () => {
      expect(DEFAULT_SERVERS.google).toBeDefined();
      expect(DEFAULT_SERVERS.google.url).toBe("https://google.mcp.hopkin.ai");
    });

    it("linkedin is present in defaults", () => {
      expect(DEFAULT_SERVERS.linkedin).toBeDefined();
      expect(DEFAULT_SERVERS.linkedin.url).toBe(
        "https://linkedin.mcp.hopkin.ai",
      );
    });

    it("reddit is present in defaults", () => {
      expect(DEFAULT_SERVERS.reddit).toBeDefined();
      expect(DEFAULT_SERVERS.reddit.url).toBe("https://reddit.mcp.hopkin.ai");
    });

    it("tiktok is present in defaults", () => {
      expect(DEFAULT_SERVERS.tiktok).toBeDefined();
      expect(DEFAULT_SERVERS.tiktok.url).toBe("https://tiktok.mcp.hopkin.ai");
    });

    it("mailchimp is present in defaults", () => {
      expect(DEFAULT_SERVERS.mailchimp).toBeDefined();
      expect(DEFAULT_SERVERS.mailchimp.url).toBe("https://mailchimp.mcp.hopkin.ai");
    });

    it("gsc is present in defaults", () => {
      expect(DEFAULT_SERVERS.gsc).toBeDefined();
      expect(DEFAULT_SERVERS.gsc.url).toBe("https://gsc.mcp.hopkin.ai");
    });

    it("exactly 7 default servers exist", () => {
      expect(Object.keys(DEFAULT_SERVERS)).toHaveLength(7);
    });
  });

  describe("getServers merging", () => {
    it("returns defaults when no config servers", () => {
      const servers = getServers();
      expect(servers).toEqual(DEFAULT_SERVERS);
    });

    it("returns defaults when config servers is undefined", () => {
      const servers = getServers(undefined);
      expect(servers).toEqual(DEFAULT_SERVERS);
    });

    it("config override changes URL but defaults remain", () => {
      const configServers = {
        meta: { url: "https://custom.example.com/meta" },
      };
      const servers = getServers(configServers);

      // meta URL overridden
      expect(servers.meta.url).toBe("https://custom.example.com/meta");

      // Other defaults still present
      expect(servers.google.url).toBe("https://google.mcp.hopkin.ai");
      expect(servers.linkedin.url).toBe("https://linkedin.mcp.hopkin.ai");
      expect(servers.reddit.url).toBe("https://reddit.mcp.hopkin.ai");
    });

    it("new platform via config appears in server list", () => {
      const configServers = {
        tiktok: { url: "https://mcp.hopkin.ai/tiktok" },
      };
      const servers = getServers(configServers);

      expect(servers.tiktok).toBeDefined();
      expect(servers.tiktok.url).toBe("https://mcp.hopkin.ai/tiktok");
    });

    it("config servers merge with defaults, not replace", () => {
      const configServers = {
        tiktok: { url: "https://mcp.hopkin.ai/tiktok" },
      };
      const servers = getServers(configServers);

      // All 7 defaults (tiktok is already a default now)
      expect(Object.keys(servers)).toHaveLength(7);
      expect(servers.meta).toBeDefined();
      expect(servers.google).toBeDefined();
      expect(servers.linkedin).toBeDefined();
      expect(servers.reddit).toBeDefined();
      expect(servers.tiktok).toBeDefined();
    });

    it("multiple config overrides apply correctly", () => {
      const configServers = {
        meta: { url: "https://custom.example.com/meta" },
        google: { url: "https://custom.example.com/google" },
        snapchat: { url: "https://mcp.hopkin.ai/snapchat" },
      };
      const servers = getServers(configServers);

      expect(servers.meta.url).toBe("https://custom.example.com/meta");
      expect(servers.google.url).toBe("https://custom.example.com/google");
      expect(servers.linkedin.url).toBe("https://linkedin.mcp.hopkin.ai");
      expect(servers.reddit.url).toBe("https://reddit.mcp.hopkin.ai");
      expect(servers.snapchat.url).toBe("https://mcp.hopkin.ai/snapchat");
    });
  });

  describe("getServerUrl", () => {
    it("returns URL for default platform", () => {
      const url = getServerUrl("meta");
      expect(url).toBe("https://meta.mcp.hopkin.ai");
    });

    it("returns undefined for unknown platform", () => {
      const url = getServerUrl("nonexistent");
      expect(url).toBeUndefined();
    });

    it("returns custom URL when config overrides", () => {
      const url = getServerUrl("meta", {
        meta: { url: "https://custom.example.com/meta" },
      });
      expect(url).toBe("https://custom.example.com/meta");
    });

    it("returns URL for custom platform from config", () => {
      const url = getServerUrl("tiktok", {
        tiktok: { url: "https://mcp.hopkin.ai/tiktok" },
      });
      expect(url).toBe("https://mcp.hopkin.ai/tiktok");
    });
  });

  describe("getPlatforms", () => {
    it("returns all default platforms sorted", () => {
      const platforms = getPlatforms();
      expect(platforms).toEqual(["google", "gsc", "linkedin", "mailchimp", "meta", "reddit", "tiktok"]);
    });

    it("includes custom platforms from config", () => {
      const platforms = getPlatforms({
        tiktok: { url: "https://mcp.hopkin.ai/tiktok" },
      });
      expect(platforms).toContain("tiktok");
      expect(platforms).toContain("meta");
      expect(platforms).toContain("google");
    });

    it("returns platforms in sorted order", () => {
      const platforms = getPlatforms({
        amazon: { url: "https://example.com/amazon" },
        tiktok: { url: "https://example.com/tiktok" },
      });
      // Should be alphabetically sorted
      const sorted = [...platforms].sort();
      expect(platforms).toEqual(sorted);
    });
  });
});
