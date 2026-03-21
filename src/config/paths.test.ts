import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import {
  getConfigDir,
  getConfigPath,
  getCredentialsPath,
  getCachePath,
  ensureConfigDir,
} from "./paths.js";

describe("config/paths", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.HOPKIN_CONFIG_DIR;
    delete process.env.XDG_CONFIG_HOME;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getConfigDir", () => {
    it("returns ~/.config/hopkin by default", () => {
      const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
      expect(getConfigDir()).toBe(path.join(home, ".config", "hopkin"));
    });

    it("respects HOPKIN_CONFIG_DIR env var", () => {
      process.env.HOPKIN_CONFIG_DIR = "/tmp/custom-hopkin";
      expect(getConfigDir()).toBe("/tmp/custom-hopkin");
    });

    it("respects XDG_CONFIG_HOME if set", () => {
      process.env.XDG_CONFIG_HOME = "/tmp/xdg-config";
      expect(getConfigDir()).toBe(path.join("/tmp/xdg-config", "hopkin"));
    });

    it("HOPKIN_CONFIG_DIR takes precedence over XDG_CONFIG_HOME", () => {
      process.env.HOPKIN_CONFIG_DIR = "/tmp/custom-hopkin";
      process.env.XDG_CONFIG_HOME = "/tmp/xdg-config";
      expect(getConfigDir()).toBe("/tmp/custom-hopkin");
    });
  });

  describe("getConfigPath", () => {
    it("returns config.json within config dir", () => {
      process.env.HOPKIN_CONFIG_DIR = "/tmp/test-hopkin";
      expect(getConfigPath()).toBe("/tmp/test-hopkin/config.json");
    });
  });

  describe("getCredentialsPath", () => {
    it("returns credentials.json within config dir", () => {
      process.env.HOPKIN_CONFIG_DIR = "/tmp/test-hopkin";
      expect(getCredentialsPath()).toBe("/tmp/test-hopkin/credentials.json");
    });
  });

  describe("getCachePath", () => {
    it("returns tools-cache.json within config dir", () => {
      process.env.HOPKIN_CONFIG_DIR = "/tmp/test-hopkin";
      expect(getCachePath()).toBe("/tmp/test-hopkin/tools-cache.json");
    });
  });

  describe("ensureConfigDir", () => {
    it("creates the config directory", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hopkin-test-"));
      const configDir = path.join(tmpDir, "nested", "hopkin");
      process.env.HOPKIN_CONFIG_DIR = configDir;
      ensureConfigDir();
      expect(fs.existsSync(configDir)).toBe(true);
      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});
