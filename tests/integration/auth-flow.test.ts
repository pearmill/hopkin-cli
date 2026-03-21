import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import { runCommand } from "citty";
import { createTempConfig, type TempConfigContext } from "../helpers/temp-config.js";
import { readCredentials, writeCredentials } from "../../src/auth/credentials.js";
import setKeyCommand from "../../src/commands/auth/set-key.js";
import statusCommand from "../../src/commands/auth/status.js";
import logoutCommand from "../../src/commands/auth/logout.js";
import whoamiCommand from "../../src/commands/auth/whoami.js";
import loginCommand from "../../src/commands/auth/login.js";

// ── Helpers ───────────────────────────────────────────────────────────

function captureStdout() {
  let captured = "";
  const original = process.stdout.write;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    captured += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
    return true;
  }) as typeof process.stdout.write;
  return {
    get output() {
      return captured;
    },
    restore() {
      process.stdout.write = original;
    },
  };
}

function captureStderr() {
  let captured = "";
  const original = process.stderr.write;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    captured += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
    return true;
  }) as typeof process.stderr.write;
  return {
    get output() {
      return captured;
    },
    restore() {
      process.stderr.write = original;
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("Auth flow integration", () => {
  let tempConfig: TempConfigContext;
  let stdout: ReturnType<typeof captureStdout>;
  let stderr: ReturnType<typeof captureStderr>;
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    tempConfig = createTempConfig();
    process.env.HOPKIN_CONFIG_DIR = tempConfig.dir;
    stdout = captureStdout();
    stderr = captureStderr();
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    stdout.restore();
    stderr.restore();
    delete process.env.HOPKIN_CONFIG_DIR;
    delete process.env.HOPKIN_API_KEY;
    process.exitCode = originalExitCode;
    tempConfig.cleanup();
  });

  // ── set-key ───────────────────────────────────────────────────────

  describe("set-key", () => {
    it("writes key to credentials file", async () => {
      await runCommand(setKeyCommand, { rawArgs: ["hpk_test123abc"] });

      const creds = readCredentials(tempConfig.dir);
      expect(creds.api_key).toBe("hpk_test123abc");
      expect(stderr.output).toContain("API key set successfully");
    });

    it("validates hpk_ prefix and rejects invalid keys", async () => {
      await runCommand(setKeyCommand, { rawArgs: ["invalid-key-no-prefix"] });

      const creds = readCredentials(tempConfig.dir);
      expect(creds.api_key).toBeUndefined();
      expect(stderr.output).toContain("Invalid API key format");
      expect(stderr.output).toContain("hpk_");
      expect(process.exitCode).toBe(1);
    });

    it("--clear removes the key", async () => {
      // First set a key
      writeCredentials({ api_key: "hpk_tobecleared" }, tempConfig.dir);

      await runCommand(setKeyCommand, { rawArgs: ["--clear"] });

      const creds = readCredentials(tempConfig.dir);
      expect(creds.api_key).toBeUndefined();
      expect(stderr.output).toContain("API key cleared");
    });

    it("errors when no key provided and no --clear", async () => {
      await runCommand(setKeyCommand, { rawArgs: [] });

      expect(stderr.output).toContain("provide an API key");
      expect(process.exitCode).toBe(1);
    });
  });

  // ── status ────────────────────────────────────────────────────────

  describe("status", () => {
    it("shows 'authenticated' when key is set", async () => {
      writeCredentials({ api_key: "hpk_mykey12345" }, tempConfig.dir);

      await runCommand(statusCommand, { rawArgs: [] });

      expect(stderr.output).toContain("Authenticated via api_key");
      expect(stderr.output).toContain("hpk_");
      expect(process.exitCode).toBeUndefined();
    });

    it("shows 'not authenticated' when no key", async () => {
      await runCommand(statusCommand, { rawArgs: [] });

      expect(stderr.output).toContain("Not authenticated");
      expect(process.exitCode).toBe(2);
    });

    it("--json returns proper JSON when authenticated", async () => {
      writeCredentials({ api_key: "hpk_jsontest99" }, tempConfig.dir);

      await runCommand(statusCommand, { rawArgs: ["--json"] });

      const parsed = JSON.parse(stdout.output.trim());
      expect(parsed.authenticated).toBe(true);
      expect(parsed.auth_type).toBe("api_key");
      expect(parsed.api_key).toContain("hpk_");
      expect(parsed.api_key).toContain("****");
    });

    it("--json returns proper JSON when not authenticated", async () => {
      await runCommand(statusCommand, { rawArgs: ["--json"] });

      const parsed = JSON.parse(stdout.output.trim());
      expect(parsed.authenticated).toBe(false);
      expect(parsed.auth_type).toBe("none");
      expect(process.exitCode).toBe(2);
    });
  });

  // ── logout ────────────────────────────────────────────────────────

  describe("logout", () => {
    it("clears credentials", async () => {
      writeCredentials({ api_key: "hpk_logout_me" }, tempConfig.dir);
      expect(fs.existsSync(tempConfig.credentialsPath)).toBe(true);

      await runCommand(logoutCommand, { rawArgs: [] });

      expect(fs.existsSync(tempConfig.credentialsPath)).toBe(false);
      expect(stderr.output).toContain("Logged out");
    });

    it("succeeds even when no credentials exist", async () => {
      await runCommand(logoutCommand, { rawArgs: [] });

      expect(stderr.output).toContain("Logged out");
    });
  });

  // ── whoami ────────────────────────────────────────────────────────

  describe("whoami", () => {
    it("shows authenticated status when key is set", async () => {
      writeCredentials({ api_key: "hpk_whoami_key" }, tempConfig.dir);

      await runCommand(whoamiCommand, { rawArgs: [] });

      expect(stderr.output).toContain("Authenticated");
      expect(stderr.output).toContain("credentials_file");
    });

    it("shows error when not authenticated", async () => {
      await runCommand(whoamiCommand, { rawArgs: [] });

      expect(stderr.output).toContain("No authentication credentials found");
      expect(process.exitCode).toBe(2);
    });

    it("--json returns proper JSON", async () => {
      writeCredentials({ api_key: "hpk_whoami_json" }, tempConfig.dir);

      await runCommand(whoamiCommand, { rawArgs: ["--json"] });

      const parsed = JSON.parse(stdout.output.trim());
      expect(parsed.authenticated).toBe(true);
      expect(parsed.auth_source).toBe("credentials_file");
      expect(parsed.key_prefix).toContain("hpk_");
    });
  });

  // ── login ─────────────────────────────────────────────────────────

  describe("login", () => {
    it("shows instructions when not authenticated", async () => {
      await runCommand(loginCommand, { rawArgs: [] });

      expect(stderr.output).toContain("hopkin auth set-key");
      expect(stderr.output).toContain("HOPKIN_API_KEY");
    });

    it("shows already authenticated when key is set", async () => {
      writeCredentials({ api_key: "hpk_already_in" }, tempConfig.dir);

      await runCommand(loginCommand, { rawArgs: [] });

      expect(stderr.output).toContain("Already authenticated");
    });
  });

  // ── Full flow ─────────────────────────────────────────────────────

  describe("full flow: set-key -> status -> logout -> status", () => {
    it("complete auth lifecycle", async () => {
      // 1. Set key
      await runCommand(setKeyCommand, { rawArgs: ["hpk_lifecycle_key"] });
      expect(stderr.output).toContain("API key set successfully");

      // 2. Status should show authenticated
      stderr.restore();
      const stderr2 = captureStderr();
      process.exitCode = undefined;
      await runCommand(statusCommand, { rawArgs: [] });
      expect(stderr2.output).toContain("Authenticated via api_key");
      expect(process.exitCode).toBeUndefined();
      stderr2.restore();

      // 3. Logout
      const stderr3 = captureStderr();
      await runCommand(logoutCommand, { rawArgs: [] });
      expect(stderr3.output).toContain("Logged out");
      stderr3.restore();

      // 4. Status should show not authenticated
      const stderr4 = captureStderr();
      // Re-assign to the test's stderr so afterEach can restore
      stderr = stderr4;
      process.exitCode = undefined;
      await runCommand(statusCommand, { rawArgs: [] });
      expect(stderr4.output).toContain("Not authenticated");
      expect(process.exitCode).toBe(2);
    });
  });
});
