import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import { createTempConfig, type TempConfigContext } from "../../tests/helpers/temp-config.js";
import {
  readConfig,
  writeConfig,
  getConfigValue,
  setConfigValue,
  unsetConfigValue,
} from "./manager.js";

describe("config/manager", () => {
  let ctx: TempConfigContext;

  beforeEach(() => {
    ctx = createTempConfig();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it("reads empty/nonexistent config and returns {}", () => {
    const config = readConfig(ctx.dir);
    expect(config).toEqual({});
  });

  it("write and read round-trip", () => {
    const config = { default_platform: "meta", output_format: "json" as const };
    writeConfig(config, ctx.dir);
    const result = readConfig(ctx.dir);
    expect(result).toEqual(config);
  });

  it("dot-path set: meta.default_account creates nested structure", () => {
    setConfigValue("meta.default_account", "123", ctx.dir);
    const config = readConfig(ctx.dir);
    expect(config).toEqual({ meta: { default_account: "123" } });
  });

  it("dot-path set: google.mcc_id creates nested structure", () => {
    setConfigValue("google.mcc_id", "456", ctx.dir);
    const config = readConfig(ctx.dir);
    expect(config).toEqual({ google: { mcc_id: "456" } });
  });

  it("dot-path get: reads nested values", () => {
    setConfigValue("meta.default_account", "789", ctx.dir);
    const value = getConfigValue("meta.default_account", ctx.dir);
    expect(value).toBe("789");
  });

  it("dot-path unset: removes nested key", () => {
    setConfigValue("meta.default_account", "123", ctx.dir);
    unsetConfigValue("meta.default_account", ctx.dir);
    const value = getConfigValue("meta.default_account", ctx.dir);
    expect(value).toBeUndefined();
  });

  it("servers.tiktok.url creates correct nested structure", () => {
    setConfigValue("servers.tiktok.url", "https://mcp.hopkin.ai/tiktok", ctx.dir);
    const config = readConfig(ctx.dir);
    expect(config).toEqual({
      servers: { tiktok: { url: "https://mcp.hopkin.ai/tiktok" } },
    });
  });

  it("global config: output_format set/get works", () => {
    setConfigValue("output_format", "csv", ctx.dir);
    const value = getConfigValue("output_format", ctx.dir);
    expect(value).toBe("csv");
  });

  it("per-platform isolation: setting meta.default_account doesn't affect google", () => {
    setConfigValue("meta.default_account", "meta-123", ctx.dir);
    setConfigValue("google.mcc_id", "google-456", ctx.dir);
    expect(getConfigValue("meta.default_account", ctx.dir)).toBe("meta-123");
    expect(getConfigValue("google.mcc_id", ctx.dir)).toBe("google-456");
    expect(getConfigValue("google.default_account", ctx.dir)).toBeUndefined();
    expect(getConfigValue("meta.mcc_id", ctx.dir)).toBeUndefined();
  });

  it("config file created on first write if it doesn't exist", () => {
    expect(fs.existsSync(ctx.configPath)).toBe(false);
    setConfigValue("output_format", "json", ctx.dir);
    expect(fs.existsSync(ctx.configPath)).toBe(true);
  });
});
