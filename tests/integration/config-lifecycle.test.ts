import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTempConfig, type TempConfigContext } from "../helpers/temp-config.js";
import {
  setConfigValue,
  getConfigValue,
  unsetConfigValue,
} from "../../src/config/manager.js";

describe("Config lifecycle", () => {
  let tempConfig: TempConfigContext;

  beforeEach(() => {
    tempConfig = createTempConfig();
    process.env.HOPKIN_CONFIG_DIR = tempConfig.dir;
  });

  afterEach(() => {
    delete process.env.HOPKIN_CONFIG_DIR;
    tempConfig.cleanup();
  });

  it("set → get round-trip for global key", () => {
    setConfigValue("output_format", "json", tempConfig.dir);
    const value = getConfigValue("output_format", tempConfig.dir);
    expect(value).toBe("json");
  });

  it("set → get for platform-scoped key (meta.default_account)", () => {
    setConfigValue("meta.default_account", "123456789", tempConfig.dir);
    const value = getConfigValue("meta.default_account", tempConfig.dir);
    expect(value).toBe("123456789");
  });

  it("set → get for nested key (google.mcc_id)", () => {
    setConfigValue("google.mcc_id", "9876543210", tempConfig.dir);
    const value = getConfigValue("google.mcc_id", tempConfig.dir);
    expect(value).toBe("9876543210");
  });

  it("set → get for server URL (servers.tiktok.url)", () => {
    setConfigValue("servers.tiktok.url", "https://mcp.hopkin.ai/tiktok", tempConfig.dir);
    const value = getConfigValue("servers.tiktok.url", tempConfig.dir);
    expect(value).toBe("https://mcp.hopkin.ai/tiktok");
  });

  it("get on object key returns the full object", () => {
    setConfigValue("meta.default_account", "111", tempConfig.dir);
    setConfigValue("meta.mcc_id", "222", tempConfig.dir);
    const value = getConfigValue("meta", tempConfig.dir);
    expect(value).toEqual({ default_account: "111", mcc_id: "222" });
  });

  it("unset removes the key", () => {
    setConfigValue("meta.default_account", "123456789", tempConfig.dir);
    expect(getConfigValue("meta.default_account", tempConfig.dir)).toBe("123456789");

    unsetConfigValue("meta.default_account", tempConfig.dir);
    expect(getConfigValue("meta.default_account", tempConfig.dir)).toBeUndefined();
  });

  it("get on nonexistent key returns undefined", () => {
    const value = getConfigValue("nonexistent.key.path", tempConfig.dir);
    expect(value).toBeUndefined();
  });
});
