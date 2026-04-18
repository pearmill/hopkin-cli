import { describe, it, expect } from "vitest";
import { toolToCommand, commandToTool, parseToolName, detectToolPrefix } from "./command-mapper.js";

describe("command-mapper", () => {
  describe("toolToCommand", () => {
    it("parses meta_ads_get_campaigns", () => {
      expect(toolToCommand("meta_ads_get_campaigns")).toEqual({
        platform: "meta",
        noun: "campaigns",
        verb: "get",
      });
    });

    it("parses google_ads_get_ad_groups (multi-word noun)", () => {
      expect(toolToCommand("google_ads_get_ad_groups")).toEqual({
        platform: "google",
        noun: "ad-groups",
        verb: "get",
      });
    });

    it("parses meta_ads_create_campaign", () => {
      expect(toolToCommand("meta_ads_create_campaign")).toEqual({
        platform: "meta",
        noun: "campaign",
        verb: "create",
      });
    });

    it("parses linkedin_ads_get_campaigns", () => {
      expect(toolToCommand("linkedin_ads_get_campaigns")).toEqual({
        platform: "linkedin",
        noun: "campaigns",
        verb: "get",
      });
    });

    it("parses reddit_ads_create_campaign", () => {
      expect(toolToCommand("reddit_ads_create_campaign")).toEqual({
        platform: "reddit",
        noun: "campaign",
        verb: "create",
      });
    });

    it("parses tool names without _ads_ separator", () => {
      expect(toolToCommand("mailchimp_list_campaigns")).toEqual({
        platform: "mailchimp",
        noun: "campaigns",
        verb: "list",
      });
    });

    it("parses mailchimp_check_auth_status (no _ads_, multi-word noun)", () => {
      expect(toolToCommand("mailchimp_check_auth_status")).toEqual({
        platform: "mailchimp",
        noun: "auth-status",
        verb: "check",
      });
    });

    it("parses mailchimp_get_audience_insights (no _ads_, multi-word noun)", () => {
      expect(toolToCommand("mailchimp_get_audience_insights")).toEqual({
        platform: "mailchimp",
        noun: "audience-insights",
        verb: "get",
      });
    });

    it("prefers _ads_ separator when present", () => {
      expect(toolToCommand("meta_ads_get_campaigns")).toEqual({
        platform: "meta",
        noun: "campaigns",
        verb: "get",
      });
    });

    it("returns null for empty string", () => {
      expect(toolToCommand("")).toBeNull();
    });

    it("returns null for single word (no underscore)", () => {
      expect(toolToCommand("ping")).toBeNull();
    });

    it("handles extra underscores in noun part", () => {
      expect(toolToCommand("meta_ads_get_ad_set_targeting")).toEqual({
        platform: "meta",
        noun: "ad-set-targeting",
        verb: "get",
      });
    });
  });

  describe("commandToTool", () => {
    it("converts parsed command back to tool name", () => {
      expect(
        commandToTool({ platform: "meta", noun: "campaigns", verb: "get" })
      ).toBe("meta_ads_get_campaigns");
    });

    it("converts hyphens back to underscores", () => {
      expect(
        commandToTool({ platform: "google", noun: "ad-groups", verb: "get" })
      ).toBe("google_ads_get_ad_groups");
    });

    it("uses custom prefix when provided", () => {
      expect(
        commandToTool({ platform: "mailchimp", noun: "campaigns", verb: "list" }, "mailchimp_")
      ).toBe("mailchimp_list_campaigns");
    });

    it("roundtrips with toolToCommand", () => {
      const toolName = "meta_ads_create_campaign";
      const parsed = toolToCommand(toolName);
      expect(parsed).not.toBeNull();
      expect(commandToTool(parsed!)).toBe(toolName);
    });

    it("roundtrips multi-word nouns", () => {
      const toolName = "google_ads_get_ad_groups";
      const parsed = toolToCommand(toolName);
      expect(parsed).not.toBeNull();
      expect(commandToTool(parsed!)).toBe(toolName);
    });

    it("roundtrips non-ads tool names with custom prefix", () => {
      const toolName = "mailchimp_list_campaigns";
      const parsed = toolToCommand(toolName);
      expect(parsed).not.toBeNull();
      expect(commandToTool(parsed!, "mailchimp_")).toBe(toolName);
    });
  });

  describe("detectToolPrefix", () => {
    it("returns ads prefix for ad platforms", () => {
      const tools = [{ name: "meta_ads_get_campaigns", description: "", inputSchema: { type: "object" as const } }];
      expect(detectToolPrefix("meta", tools)).toBe("meta_ads_");
    });

    it("returns bare prefix for non-ads platforms", () => {
      const tools = [{ name: "mailchimp_list_campaigns", description: "", inputSchema: { type: "object" as const } }];
      expect(detectToolPrefix("mailchimp", tools)).toBe("mailchimp_");
    });

    it("resolves gsc alias to google_search_console_", () => {
      const tools = [{ name: "google_search_console_check_auth_status", description: "", inputSchema: { type: "object" as const } }];
      expect(detectToolPrefix("gsc", tools)).toBe("google_search_console_");
    });
  });

  describe("toolToCommand with aliased platform", () => {
    it("parses google_search_console_check_auth_status with gsc platform hint", () => {
      expect(toolToCommand("google_search_console_check_auth_status", "gsc")).toEqual({
        platform: "gsc",
        noun: "auth-status",
        verb: "check",
      });
    });

    it("parses google_search_console_list_sites with gsc platform hint", () => {
      expect(toolToCommand("google_search_console_list_sites", "gsc")).toEqual({
        platform: "gsc",
        noun: "sites",
        verb: "list",
      });
    });

    it("returns null for non-matching tool with gsc platform hint", () => {
      expect(toolToCommand("meta_ads_get_campaigns", "gsc")).toBeNull();
    });
  });

  describe("commandToTool with aliased platform", () => {
    it("uses explicit prefix when provided", () => {
      expect(
        commandToTool({ platform: "gsc", noun: "sites", verb: "list" }, "google_search_console_")
      ).toBe("google_search_console_list_sites");
    });

    it("roundtrips gsc tool name with explicit prefix", () => {
      const toolName = "google_search_console_check_auth_status";
      const parsed = toolToCommand(toolName, "gsc");
      expect(parsed).not.toBeNull();
      expect(commandToTool(parsed!, "google_search_console_")).toBe(toolName);
    });
  });

  describe("parseToolName with aliased platform", () => {
    it("extracts verb and noun for gsc platform", () => {
      expect(parseToolName("google_search_console_check_auth_status", "gsc")).toEqual({
        verb: "check",
        noun: "auth-status",
      });
    });

    it("returns null if tool does not match gsc alias", () => {
      expect(parseToolName("meta_ads_get_campaigns", "gsc")).toBeNull();
    });
  });

  describe("parseToolName", () => {
    it("extracts verb and noun for a given platform", () => {
      expect(parseToolName("meta_ads_get_campaigns", "meta")).toEqual({
        verb: "get",
        noun: "campaigns",
      });
    });

    it("returns null if platform does not match", () => {
      expect(parseToolName("meta_ads_get_campaigns", "google")).toBeNull();
    });

    it("handles multi-word nouns", () => {
      expect(parseToolName("google_ads_get_ad_groups", "google")).toEqual({
        verb: "get",
        noun: "ad-groups",
      });
    });
  });
});
