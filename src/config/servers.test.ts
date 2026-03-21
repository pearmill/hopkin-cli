import { describe, it, expect } from "vitest";
import { getServers, getServerUrl, getPlatforms } from "./servers.js";

describe("config/servers", () => {
  describe("getServers", () => {
    it("returns default servers (meta/google/linkedin/reddit) without config", () => {
      const servers = getServers();
      expect(servers.meta).toEqual({ url: "https://meta.mcp.hopkin.ai" });
      expect(servers.google).toEqual({ url: "https://google.mcp.hopkin.ai" });
      expect(servers.linkedin).toEqual({ url: "https://linkedin.mcp.hopkin.ai" });
      expect(servers.reddit).toEqual({ url: "https://reddit.mcp.hopkin.ai" });
    });

    it("user override replaces a default URL", () => {
      const servers = getServers({
        meta: { url: "https://custom.example.com/meta" },
      });
      expect(servers.meta.url).toBe("https://custom.example.com/meta");
    });

    it("new platform added via config appears in server list", () => {
      const servers = getServers({
        tiktok: { url: "https://mcp.hopkin.ai/tiktok" },
      });
      expect(servers.tiktok).toEqual({ url: "https://mcp.hopkin.ai/tiktok" });
    });

    it("config overrides merge, not replace defaults", () => {
      const servers = getServers({
        meta: { url: "https://custom.example.com/meta" },
      });
      // Other defaults still present
      expect(servers.google).toEqual({ url: "https://google.mcp.hopkin.ai" });
      expect(servers.linkedin).toEqual({ url: "https://linkedin.mcp.hopkin.ai" });
      expect(servers.reddit).toEqual({ url: "https://reddit.mcp.hopkin.ai" });
    });

    it("default servers cannot be deleted (still present even if not in config)", () => {
      const servers = getServers({});
      expect(servers.meta).toBeDefined();
      expect(servers.google).toBeDefined();
      expect(servers.linkedin).toBeDefined();
      expect(servers.reddit).toBeDefined();
    });

    it("custom server added via config is retrievable", () => {
      const servers = getServers({
        snapchat: { url: "https://mcp.hopkin.ai/snapchat" },
      });
      expect(servers.snapchat.url).toBe("https://mcp.hopkin.ai/snapchat");
    });
  });

  describe("getServerUrl", () => {
    it("returns correct URL for each default platform", () => {
      expect(getServerUrl("meta")).toBe("https://meta.mcp.hopkin.ai");
      expect(getServerUrl("google")).toBe("https://google.mcp.hopkin.ai");
      expect(getServerUrl("linkedin")).toBe("https://linkedin.mcp.hopkin.ai");
      expect(getServerUrl("reddit")).toBe("https://reddit.mcp.hopkin.ai");
    });

    it("returns undefined for unknown platform", () => {
      expect(getServerUrl("unknown")).toBeUndefined();
    });

    it("returns overridden URL from config", () => {
      expect(
        getServerUrl("meta", { meta: { url: "https://custom.example.com/meta" } })
      ).toBe("https://custom.example.com/meta");
    });
  });

  describe("getPlatforms", () => {
    it("returns all platforms sorted", () => {
      const platforms = getPlatforms();
      expect(platforms).toEqual(["google", "linkedin", "meta", "reddit", "tiktok"]);
    });

    it("includes custom platforms sorted with defaults", () => {
      const platforms = getPlatforms({
        snapchat: { url: "https://mcp.hopkin.ai/snapchat" },
      });
      expect(platforms).toEqual(["google", "linkedin", "meta", "reddit", "snapchat", "tiktok"]);
    });
  });
});
