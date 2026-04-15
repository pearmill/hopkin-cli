import { describe, it, expect } from "vitest";
import { findToolForCommand } from "./platform-router.js";
import type { ToolsCache, MCPTool } from "../types.js";

// ── Helpers ──────────────────────────────────────────────────────────

function makeTool(name: string, desc = ""): MCPTool {
  return { name, description: desc, inputSchema: { type: "object", properties: {} } };
}

function makeCache(platform: string, tools: MCPTool[]): ToolsCache {
  return {
    version: 1,
    entries: {
      [platform]: {
        platform,
        tools,
        fetched_at: Date.now(),
        server_url: "http://localhost:3000",
      },
    },
  };
}

const META_TOOLS: MCPTool[] = [
  makeTool("meta_ads_ping", "Ping"),
  makeTool("meta_ads_check_auth_status", "Check auth"),
  makeTool("meta_ads_list_ad_accounts", "List ad accounts"),
  makeTool("meta_ads_list_campaigns", "List campaigns"),
  makeTool("meta_ads_get_campaigns", "Get campaign"),
  makeTool("meta_ads_list_adsets", "List ad sets"),
  makeTool("meta_ads_list_ads", "List ads"),
  makeTool("meta_ads_get_insights", "Get insights"),
  makeTool("meta_ads_developer_feedback", "Dev feedback"),
];

const GOOGLE_TOOLS: MCPTool[] = [
  makeTool("google_ads_ping", "Ping"),
  makeTool("google_ads_list_accounts", "List accounts"),
  makeTool("google_ads_list_campaigns", "List campaigns"),
  makeTool("google_ads_list_ad_groups", "List ad groups"),
  makeTool("google_ads_get_insights", "Get insights"),
];

const MAILCHIMP_TOOLS: MCPTool[] = [
  makeTool("mailchimp_check_auth_status", "Check auth status"),
  makeTool("mailchimp_list_campaigns", "List campaigns"),
  makeTool("mailchimp_get_campaign", "Get campaign details"),
  makeTool("mailchimp_list_audiences", "List audiences"),
  makeTool("mailchimp_get_audience", "Get audience details"),
  makeTool("mailchimp_get_audience_insights", "Get audience insights"),
  makeTool("mailchimp_list_templates", "List templates"),
  makeTool("mailchimp_ping", "Ping"),
  makeTool("mailchimp_developer_feedback", "Dev feedback"),
];

// ── findToolForCommand ───────────────────────────────────────────────

describe("findToolForCommand", () => {
  const metaCache = makeCache("meta", META_TOOLS);

  describe("single-arg commands", () => {
    it("direct match: ping → meta_ads_ping", () => {
      const result = findToolForCommand("meta", ["ping"], metaCache);
      expect(result?.tool.name).toBe("meta_ads_ping");
    });

    it("defaults to list_: campaigns → meta_ads_list_campaigns", () => {
      const result = findToolForCommand("meta", ["campaigns"], metaCache);
      expect(result?.tool.name).toBe("meta_ads_list_campaigns");
    });

    it("falls back to get_ if no list_: insights → meta_ads_get_insights", () => {
      const result = findToolForCommand("meta", ["insights"], metaCache);
      expect(result?.tool.name).toBe("meta_ads_get_insights");
    });

    it("converts hyphens to underscores: ad-accounts → meta_ads_list_ad_accounts", () => {
      const result = findToolForCommand("meta", ["ad-accounts"], metaCache);
      expect(result?.tool.name).toBe("meta_ads_list_ad_accounts");
    });

    it("returns null for unknown resource", () => {
      const result = findToolForCommand("meta", ["nonexistent"], metaCache);
      expect(result).toBeNull();
    });
  });

  describe("multi-arg commands (noun verb)", () => {
    it("noun verb: campaigns list → meta_ads_list_campaigns", () => {
      const result = findToolForCommand("meta", ["campaigns", "list"], metaCache);
      expect(result?.tool.name).toBe("meta_ads_list_campaigns");
    });

    it("noun verb: campaigns get → meta_ads_get_campaigns", () => {
      const result = findToolForCommand("meta", ["campaigns", "get"], metaCache);
      expect(result?.tool.name).toBe("meta_ads_get_campaigns");
    });

    it("verb noun: list campaigns → meta_ads_list_campaigns", () => {
      const result = findToolForCommand("meta", ["list", "campaigns"], metaCache);
      expect(result?.tool.name).toBe("meta_ads_list_campaigns");
    });

    it("hyphenated noun: ad-accounts list → meta_ads_list_ad_accounts", () => {
      const result = findToolForCommand("meta", ["ad-accounts", "list"], metaCache);
      expect(result?.tool.name).toBe("meta_ads_list_ad_accounts");
    });

    it("direct concatenation: check auth-status → meta_ads_check_auth_status", () => {
      const result = findToolForCommand("meta", ["check", "auth-status"], metaCache);
      expect(result?.tool.name).toBe("meta_ads_check_auth_status");
    });

    it("developer feedback → meta_ads_developer_feedback", () => {
      const result = findToolForCommand("meta", ["developer", "feedback"], metaCache);
      expect(result?.tool.name).toBe("meta_ads_developer_feedback");
    });
  });

  describe("fallback noun matching", () => {
    it("ad-accounts matches noun ad_accounts in list_ad_accounts", () => {
      const result = findToolForCommand("meta", ["ad-accounts"], metaCache);
      expect(result?.tool.name).toBe("meta_ads_list_ad_accounts");
    });

    it("adsets → meta_ads_list_adsets via fallback", () => {
      const result = findToolForCommand("meta", ["adsets"], metaCache);
      expect(result?.tool.name).toBe("meta_ads_list_adsets");
    });
  });

  describe("cross-platform: google tools", () => {
    const googleCache = makeCache("google", GOOGLE_TOOLS);

    it("accounts → google_ads_list_accounts", () => {
      const result = findToolForCommand("google", ["accounts"], googleCache);
      expect(result?.tool.name).toBe("google_ads_list_accounts");
    });

    it("ad-groups list → google_ads_list_ad_groups", () => {
      const result = findToolForCommand("google", ["ad-groups", "list"], googleCache);
      expect(result?.tool.name).toBe("google_ads_list_ad_groups");
    });

    it("ad-accounts returns null (Google has accounts, not ad-accounts)", () => {
      const result = findToolForCommand("google", ["ad-accounts"], googleCache);
      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("returns null for empty commandArgs", () => {
      const result = findToolForCommand("meta", [], metaCache);
      expect(result).toBeNull();
    });

    it("returns null for unknown platform", () => {
      const result = findToolForCommand("tiktok", ["campaigns"], metaCache);
      expect(result).toBeNull();
    });

    it("returns serverUrl alongside tool", () => {
      const result = findToolForCommand("meta", ["ping"], metaCache);
      expect(result?.serverUrl).toBe("http://localhost:3000");
    });
  });
});

  describe("non-ads platforms: mailchimp (no _ads_ separator)", () => {
    const mailchimpCache = makeCache("mailchimp", MAILCHIMP_TOOLS);

    it("direct match: ping → mailchimp_ping", () => {
      const result = findToolForCommand("mailchimp", ["ping"], mailchimpCache);
      expect(result?.tool.name).toBe("mailchimp_ping");
    });

    it("defaults to list_: campaigns → mailchimp_list_campaigns", () => {
      const result = findToolForCommand("mailchimp", ["campaigns"], mailchimpCache);
      expect(result?.tool.name).toBe("mailchimp_list_campaigns");
    });

    it("falls back to get_ if no list_: audience → mailchimp_get_audience", () => {
      const result = findToolForCommand("mailchimp", ["audience"], mailchimpCache);
      expect(result?.tool.name).toBe("mailchimp_get_audience");
    });

    it("noun verb: campaigns list → mailchimp_list_campaigns", () => {
      const result = findToolForCommand("mailchimp", ["campaigns", "list"], mailchimpCache);
      expect(result?.tool.name).toBe("mailchimp_list_campaigns");
    });

    it("noun verb: campaign get → mailchimp_get_campaign", () => {
      const result = findToolForCommand("mailchimp", ["campaign", "get"], mailchimpCache);
      expect(result?.tool.name).toBe("mailchimp_get_campaign");
    });

    it("verb noun: list audiences → mailchimp_list_audiences", () => {
      const result = findToolForCommand("mailchimp", ["list", "audiences"], mailchimpCache);
      expect(result?.tool.name).toBe("mailchimp_list_audiences");
    });

    it("direct concatenation: check auth-status → mailchimp_check_auth_status", () => {
      const result = findToolForCommand("mailchimp", ["check", "auth-status"], mailchimpCache);
      expect(result?.tool.name).toBe("mailchimp_check_auth_status");
    });

    it("developer feedback → mailchimp_developer_feedback", () => {
      const result = findToolForCommand("mailchimp", ["developer", "feedback"], mailchimpCache);
      expect(result?.tool.name).toBe("mailchimp_developer_feedback");
    });

    it("hyphenated noun: audience-insights get → mailchimp_get_audience_insights", () => {
      const result = findToolForCommand("mailchimp", ["audience-insights", "get"], mailchimpCache);
      expect(result?.tool.name).toBe("mailchimp_get_audience_insights");
    });

    it("returns null for unknown resource", () => {
      const result = findToolForCommand("mailchimp", ["nonexistent"], mailchimpCache);
      expect(result).toBeNull();
    });
  });

// ── parseResponseData (imported indirectly via module) ────────────────
// parseResponseData is not exported, so we test it through the integration tests.
// See tests/integration/structured-content.test.ts

// ── suggestCommands (not exported, tested via integration) ───────────
// See tests/integration/command-suggestions.test.ts
