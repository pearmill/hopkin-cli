import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import { createTempConfig, type TempConfigContext } from "../../tests/helpers/temp-config.js";
import {
  readCredentials,
  writeCredentials,
  clearCredentials,
  hasCredentials,
} from "./credentials.js";

describe("auth/credentials", () => {
  let ctx: TempConfigContext;

  beforeEach(() => {
    ctx = createTempConfig();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it("read nonexistent returns empty object", () => {
    const creds = readCredentials(ctx.dir);
    expect(creds).toEqual({});
  });

  it("write API key and read back matches", () => {
    writeCredentials({ api_key: "sk-test-123" }, ctx.dir);
    const creds = readCredentials(ctx.dir);
    expect(creds.api_key).toBe("sk-test-123");
  });

  it("write OAuth tokens and read back matches", () => {
    const oauth = {
      access_token: "at-abc",
      refresh_token: "rt-xyz",
      expires_at: Date.now() + 3600000,
    };
    writeCredentials({ oauth }, ctx.dir);
    const creds = readCredentials(ctx.dir);
    expect(creds.oauth).toEqual(oauth);
  });

  it("file has 0600 permissions after write", () => {
    writeCredentials({ api_key: "sk-test" }, ctx.dir);
    const stat = fs.statSync(ctx.credentialsPath);
    const mode = stat.mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("clearCredentials removes the file", () => {
    writeCredentials({ api_key: "sk-test" }, ctx.dir);
    expect(fs.existsSync(ctx.credentialsPath)).toBe(true);
    clearCredentials(ctx.dir);
    expect(fs.existsSync(ctx.credentialsPath)).toBe(false);
  });

  it("hasCredentials returns true when credentials exist", () => {
    writeCredentials({ api_key: "sk-test" }, ctx.dir);
    expect(hasCredentials(ctx.dir)).toBe(true);
  });

  it("hasCredentials returns false when no credentials", () => {
    expect(hasCredentials(ctx.dir)).toBe(false);
  });
});
