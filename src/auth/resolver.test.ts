import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTempConfig, type TempConfigContext } from "../../tests/helpers/temp-config.js";
import { writeCredentials } from "./credentials.js";
import { resolveAuth } from "./resolver.js";
import { AuthError } from "../errors.js";

describe("auth/resolver", () => {
  let ctx: TempConfigContext;
  const originalEnv = process.env.HOPKIN_API_KEY;

  beforeEach(() => {
    ctx = createTempConfig();
    delete process.env.HOPKIN_API_KEY;
  });

  afterEach(() => {
    ctx.cleanup();
    if (originalEnv !== undefined) {
      process.env.HOPKIN_API_KEY = originalEnv;
    } else {
      delete process.env.HOPKIN_API_KEY;
    }
  });

  it("flag provided uses flag value", () => {
    const result = resolveAuth({ apiKeyFlag: "flag-key", configDir: ctx.dir });
    expect(result).toBe("flag-key");
  });

  it("no flag, HOPKIN_API_KEY env uses env value", () => {
    process.env.HOPKIN_API_KEY = "env-key";
    const result = resolveAuth({ configDir: ctx.dir });
    expect(result).toBe("env-key");
  });

  it("no flag/env, file has api_key uses file value", () => {
    writeCredentials({ api_key: "file-key" }, ctx.dir);
    const result = resolveAuth({ configDir: ctx.dir });
    expect(result).toBe("file-key");
  });

  it("no flag/env, file has OAuth with valid token uses OAuth access_token", () => {
    writeCredentials({
      oauth: {
        access_token: "oauth-token",
        refresh_token: "rt",
        expires_at: Date.now() + 3600000,
      },
    }, ctx.dir);
    const result = resolveAuth({ configDir: ctx.dir });
    expect(result).toBe("oauth-token");
  });

  it("no flag/env/file throws AuthError with exit code 2", () => {
    expect(() => resolveAuth({ configDir: ctx.dir })).toThrow(AuthError);
    try {
      resolveAuth({ configDir: ctx.dir });
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).exitCode).toBe(2);
    }
  });

  it("flag takes precedence over env", () => {
    process.env.HOPKIN_API_KEY = "env-key";
    const result = resolveAuth({ apiKeyFlag: "flag-key", configDir: ctx.dir });
    expect(result).toBe("flag-key");
  });

  it("env takes precedence over file", () => {
    process.env.HOPKIN_API_KEY = "env-key";
    writeCredentials({ api_key: "file-key" }, ctx.dir);
    const result = resolveAuth({ configDir: ctx.dir });
    expect(result).toBe("env-key");
  });

  it("API key in file takes precedence over OAuth", () => {
    writeCredentials({
      api_key: "file-api-key",
      oauth: {
        access_token: "oauth-token",
        refresh_token: "rt",
        expires_at: Date.now() + 3600000,
      },
    }, ctx.dir);
    const result = resolveAuth({ configDir: ctx.dir });
    expect(result).toBe("file-api-key");
  });

  it("expired OAuth treated as missing, throws AuthError with hint to re-login", () => {
    writeCredentials({
      oauth: {
        access_token: "expired-token",
        refresh_token: "rt",
        expires_at: Date.now() - 1000,
      },
    }, ctx.dir);
    expect(() => resolveAuth({ configDir: ctx.dir })).toThrow(AuthError);
    try {
      resolveAuth({ configDir: ctx.dir });
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).hint).toContain("re-login");
    }
  });
});
