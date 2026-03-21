import { describe, it, expect } from "vitest";
import { schemaToFlags } from "./schema-to-flags.js";
import type { JSONSchema } from "../types.js";

describe("schemaToFlags", () => {
  it("converts a required string property to a flag definition", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        campaign_name: { type: "string", description: "Name of the campaign" },
      },
      required: ["campaign_name"],
    };

    const flags = schemaToFlags(schema);
    expect(flags).toEqual([
      {
        name: "campaign-name",
        type: "string",
        description: "Name of the campaign",
        required: true,
      },
    ]);
  });

  it("converts a number property", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        budget: { type: "number" },
      },
    };

    const flags = schemaToFlags(schema);
    expect(flags).toEqual([
      {
        name: "budget",
        type: "number",
        required: false,
      },
    ]);
  });

  it("converts a boolean property", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        active: { type: "boolean" },
      },
    };

    const flags = schemaToFlags(schema);
    expect(flags).toEqual([
      {
        name: "active",
        type: "boolean",
        required: false,
      },
    ]);
  });

  it("includes choices for enum properties", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        status: { type: "string", enum: ["ACTIVE", "PAUSED"] },
      },
    };

    const flags = schemaToFlags(schema);
    expect(flags).toHaveLength(1);
    expect(flags[0].choices).toEqual(["ACTIVE", "PAUSED"]);
  });

  it("includes default value", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        format: { type: "string", default: "foo" },
      },
    };

    const flags = schemaToFlags(schema);
    expect(flags).toHaveLength(1);
    expect(flags[0].default).toBe("foo");
  });

  it("skips internal fields: cursor and limit", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        cursor: { type: "string" },
        limit: { type: "number" },
        campaign_id: { type: "string" },
      },
      required: ["campaign_id"],
    };

    const flags = schemaToFlags(schema);
    expect(flags).toHaveLength(1);
    expect(flags[0].name).toBe("campaign-id");
  });

  it("converts multiple properties to multiple flag definitions", () => {
    const schema: JSONSchema = {
      type: "object",
      properties: {
        name: { type: "string" },
        budget: { type: "number" },
        active: { type: "boolean" },
      },
      required: ["name"],
    };

    const flags = schemaToFlags(schema);
    expect(flags).toHaveLength(3);
    const names = flags.map((f) => f.name);
    expect(names).toContain("name");
    expect(names).toContain("budget");
    expect(names).toContain("active");
    expect(flags.find((f) => f.name === "name")!.required).toBe(true);
    expect(flags.find((f) => f.name === "budget")!.required).toBe(false);
  });

  it("returns empty array for empty schema", () => {
    const schema: JSONSchema = { type: "object" };
    expect(schemaToFlags(schema)).toEqual([]);
  });

  it("returns empty array for schema with no properties", () => {
    const schema: JSONSchema = { type: "object", properties: {} };
    expect(schemaToFlags(schema)).toEqual([]);
  });
});
