import { describe, it, expect } from "vitest";
import { buildArgs } from "./arg-builder.js";
import type { JSONSchema } from "../types.js";

describe("buildArgs", () => {
  const baseSchema: JSONSchema = {
    type: "object",
    properties: {
      campaign_name: { type: "string" },
      budget: { type: "number" },
      active: { type: "boolean" },
    },
  };

  it("passes string flags through as strings", () => {
    const result = buildArgs(
      { "campaign-name": "My Campaign" },
      baseSchema
    );
    expect(result.campaign_name).toBe("My Campaign");
  });

  it("converts number flags to numbers", () => {
    const result = buildArgs({ budget: "100" }, baseSchema);
    expect(result.budget).toBe(100);
  });

  it("converts boolean flags to booleans", () => {
    const result = buildArgs({ active: "true" }, baseSchema);
    expect(result.active).toBe(true);
  });

  it("converts boolean flag 'false' string to false", () => {
    const result = buildArgs({ active: "false" }, baseSchema);
    expect(result.active).toBe(false);
  });

  it("maps --account to account_id field in schema", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        account_id: { type: "string" },
        campaign_name: { type: "string" },
      },
      required: ["account_id"],
    };

    const result = buildArgs({ account: "act_123" }, schema);
    expect(result.account_id).toBe("act_123");
  });

  it("maps --account to customer_id field in schema", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        customer_id: { type: "string" },
        campaign_name: { type: "string" },
      },
      required: ["customer_id"],
    };

    const result = buildArgs({ account: "123456" }, schema);
    expect(result.customer_id).toBe("123456");
  });

  it("throws error for missing required args", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        campaign_id: { type: "string" },
        account_id: { type: "string" },
      },
      required: ["campaign_id", "account_id"],
    };

    expect(() => buildArgs({}, schema)).toThrow(/campaign_id/);
    expect(() => buildArgs({}, schema)).toThrow(/account_id/);
  });

  it("ignores extra unknown flags", () => {
    const result = buildArgs(
      { "campaign-name": "Test", "unknown-flag": "value" },
      baseSchema
    );
    expect(result).toEqual({ campaign_name: "Test" });
    expect(result).not.toHaveProperty("unknown_flag");
    expect(result).not.toHaveProperty("unknown-flag");
  });

  it("returns empty object for empty args and no required fields", () => {
    const result = buildArgs({}, baseSchema);
    expect(result).toEqual({});
  });

  it("injects platform config values (e.g., mcc_id to login_customer_id)", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        login_customer_id: { type: "string" },
        customer_id: { type: "string" },
      },
      required: ["customer_id"],
    };

    const platformConfig = { mcc_id: "999888" };
    const result = buildArgs(
      { "customer-id": "123" },
      schema,
      platformConfig
    );
    expect(result.login_customer_id).toBe("999888");
    expect(result.customer_id).toBe("123");
  });

  it("parses JSON string into object for object-type schema property", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        time_range: { type: "object" },
      },
    };

    const result = buildArgs(
      { "time-range": '{"since":"2026-02-01","until":"2026-03-01"}' },
      schema
    );
    expect(result.time_range).toEqual({
      since: "2026-02-01",
      until: "2026-03-01",
    });
  });

  it("passes through already-parsed object for object-type schema property", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        time_range: { type: "object" },
      },
    };

    const obj = { since: "2026-02-01", until: "2026-03-01" };
    const result = buildArgs({ "time-range": obj }, schema);
    expect(result.time_range).toEqual(obj);
  });

  it("throws descriptive error for invalid JSON on object-type property", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        time_range: { type: "object" },
      },
    };

    expect(() =>
      buildArgs({ "time-range": "not-json" }, schema)
    ).toThrow(/Invalid JSON/);
  });

  it("parses JSON string into array for array-type schema property", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        metrics: { type: "array" },
      },
    };

    const result = buildArgs(
      { metrics: '["impressions","clicks"]' },
      schema
    );
    expect(result.metrics).toEqual(["impressions", "clicks"]);
  });

  it("converts kebab-case flag names to snake_case", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        campaign_name: { type: "string" },
        ad_group_id: { type: "string" },
      },
    };

    const result = buildArgs(
      { "campaign-name": "Test", "ad-group-id": "123" },
      schema
    );
    expect(result.campaign_name).toBe("Test");
    expect(result.ad_group_id).toBe("123");
  });
});
