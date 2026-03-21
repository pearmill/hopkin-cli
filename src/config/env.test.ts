import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getEnvConfig, getEnvValue } from "./env.js";

describe("config/env", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.HOPKIN_API_KEY;
    delete process.env.HOPKIN_DEFAULT_ACCOUNT;
    delete process.env.HOPKIN_DEFAULT_PLATFORM;
    delete process.env.HOPKIN_OUTPUT_FORMAT;
    delete process.env.HOPKIN_NO_COLOR;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getEnvValue", () => {
    it("returns value for HOPKIN_API_KEY", () => {
      process.env.HOPKIN_API_KEY = "test-key-123";
      expect(getEnvValue("HOPKIN_API_KEY")).toBe("test-key-123");
    });

    it("returns undefined for missing env vars", () => {
      expect(getEnvValue("HOPKIN_API_KEY")).toBeUndefined();
    });
  });

  describe("getEnvConfig", () => {
    it("maps HOPKIN_API_KEY to api_key", () => {
      process.env.HOPKIN_API_KEY = "sk-test";
      const config = getEnvConfig();
      expect(config.api_key).toBe("sk-test");
    });

    it("maps HOPKIN_DEFAULT_ACCOUNT to default_account", () => {
      process.env.HOPKIN_DEFAULT_ACCOUNT = "acct-123";
      const config = getEnvConfig();
      expect(config.default_account).toBe("acct-123");
    });

    it("maps HOPKIN_DEFAULT_PLATFORM to default_platform", () => {
      process.env.HOPKIN_DEFAULT_PLATFORM = "meta";
      const config = getEnvConfig();
      expect(config.default_platform).toBe("meta");
    });

    it("maps HOPKIN_OUTPUT_FORMAT to output_format", () => {
      process.env.HOPKIN_OUTPUT_FORMAT = "json";
      const config = getEnvConfig();
      expect(config.output_format).toBe("json");
    });

    it("maps HOPKIN_NO_COLOR to no_color flag", () => {
      process.env.HOPKIN_NO_COLOR = "1";
      const config = getEnvConfig();
      expect(config.no_color).toBe(true);
    });

    it("returns empty partial config when no env vars set", () => {
      const config = getEnvConfig();
      expect(config.api_key).toBeUndefined();
      expect(config.default_account).toBeUndefined();
      expect(config.default_platform).toBeUndefined();
      expect(config.output_format).toBeUndefined();
      expect(config.no_color).toBeUndefined();
    });
  });
});
