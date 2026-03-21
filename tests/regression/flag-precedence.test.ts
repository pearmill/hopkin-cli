import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import { resolveAuth } from "../../src/auth/resolver.js";
import { writeCredentials, clearCredentials } from "../../src/auth/credentials.js";
import { AuthError } from "../../src/errors.js";
import { detectFormat } from "../../src/output/formatter.js";
import { readConfig, writeConfig } from "../../src/config/manager.js";
import { createTempConfig, type TempConfigContext } from "../helpers/temp-config.js";

describe("Flag precedence", () => {
  let tempConfig: TempConfigContext;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    tempConfig = createTempConfig();
    process.env.HOPKIN_CONFIG_DIR = tempConfig.dir;
    // Save env vars we'll modify
    savedEnv.HOPKIN_API_KEY = process.env.HOPKIN_API_KEY;
    savedEnv.HOPKIN_DEFAULT_ACCOUNT = process.env.HOPKIN_DEFAULT_ACCOUNT;
  });

  afterEach(() => {
    // Restore env vars
    if (savedEnv.HOPKIN_API_KEY === undefined) {
      delete process.env.HOPKIN_API_KEY;
    } else {
      process.env.HOPKIN_API_KEY = savedEnv.HOPKIN_API_KEY;
    }
    if (savedEnv.HOPKIN_DEFAULT_ACCOUNT === undefined) {
      delete process.env.HOPKIN_DEFAULT_ACCOUNT;
    } else {
      process.env.HOPKIN_DEFAULT_ACCOUNT = savedEnv.HOPKIN_DEFAULT_ACCOUNT;
    }
    delete process.env.HOPKIN_CONFIG_DIR;
    tempConfig.cleanup();
  });

  describe("Auth chain: flag > env > file", () => {
    it("flag present overrides env and file", () => {
      process.env.HOPKIN_API_KEY = "env-key";
      writeCredentials({ api_key: "file-key" }, tempConfig.dir);

      const result = resolveAuth({
        apiKeyFlag: "flag-key",
        configDir: tempConfig.dir,
      });
      expect(result).toBe("flag-key");
    });

    it("env overrides file when no flag", () => {
      process.env.HOPKIN_API_KEY = "env-key";
      writeCredentials({ api_key: "file-key" }, tempConfig.dir);

      const result = resolveAuth({ configDir: tempConfig.dir });
      expect(result).toBe("env-key");
    });

    it("file used when no flag and no env", () => {
      delete process.env.HOPKIN_API_KEY;
      writeCredentials({ api_key: "file-key" }, tempConfig.dir);

      const result = resolveAuth({ configDir: tempConfig.dir });
      expect(result).toBe("file-key");
    });

    it("API key in file takes precedence over OAuth in file", () => {
      delete process.env.HOPKIN_API_KEY;
      writeCredentials(
        {
          api_key: "file-api-key",
          oauth: {
            access_token: "oauth-token",
            refresh_token: "refresh-token",
            expires_at: Date.now() + 3600_000,
          },
        },
        tempConfig.dir,
      );

      const result = resolveAuth({ configDir: tempConfig.dir });
      expect(result).toBe("file-api-key");
    });

    it("OAuth token used when no API key in file", () => {
      delete process.env.HOPKIN_API_KEY;
      writeCredentials(
        {
          oauth: {
            access_token: "oauth-token",
            refresh_token: "refresh-token",
            expires_at: Date.now() + 3600_000,
          },
        },
        tempConfig.dir,
      );

      const result = resolveAuth({ configDir: tempConfig.dir });
      expect(result).toBe("oauth-token");
    });

    it("expired OAuth throws AuthError", () => {
      delete process.env.HOPKIN_API_KEY;
      writeCredentials(
        {
          oauth: {
            access_token: "expired-token",
            refresh_token: "refresh-token",
            expires_at: Date.now() - 1000,
          },
        },
        tempConfig.dir,
      );

      expect(() => resolveAuth({ configDir: tempConfig.dir })).toThrow(
        AuthError,
      );
    });

    it("missing all credentials throws AuthError", () => {
      delete process.env.HOPKIN_API_KEY;
      // No credentials file

      expect(() => resolveAuth({ configDir: tempConfig.dir })).toThrow(
        AuthError,
      );
    });

    it("AuthError from missing credentials has exitCode 2", () => {
      delete process.env.HOPKIN_API_KEY;

      try {
        resolveAuth({ configDir: tempConfig.dir });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).exitCode).toBe(2);
      }
    });

    it("flag overrides even when env and file are both present", () => {
      process.env.HOPKIN_API_KEY = "env-key";
      writeCredentials(
        {
          api_key: "file-key",
          oauth: {
            access_token: "oauth-token",
            refresh_token: "refresh",
            expires_at: Date.now() + 3600_000,
          },
        },
        tempConfig.dir,
      );

      const result = resolveAuth({
        apiKeyFlag: "flag-key",
        configDir: tempConfig.dir,
      });
      expect(result).toBe("flag-key");
    });
  });

  describe("Config chain: --format flag > config output_format > default", () => {
    it("--format flag takes highest precedence", () => {
      const result = detectFormat({
        isTTY: true,
        format: "csv",
      });
      expect(result).toBe("csv");
    });

    it("--json flag returns json", () => {
      const result = detectFormat({
        isTTY: true,
        json: true,
      });
      expect(result).toBe("json");
    });

    it("--format overrides --json", () => {
      const result = detectFormat({
        isTTY: true,
        json: true,
        format: "tsv",
      });
      // format takes precedence since it's checked first
      expect(result).toBe("tsv");
    });

    it("TTY defaults to table when no flags", () => {
      const result = detectFormat({
        isTTY: true,
      });
      expect(result).toBe("table");
    });

    it("non-TTY defaults to json when no flags", () => {
      const result = detectFormat({
        isTTY: false,
      });
      expect(result).toBe("json");
    });
  });
});
