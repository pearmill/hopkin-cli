import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTempConfig, type TempConfigContext } from "../helpers/temp-config.js";
import { writeCredentials } from "../../src/auth/credentials.js";
import { AuthError } from "../../src/errors.js";

// We import the command run functions directly to test them
// The apikeys commands use resolveAuth which throws AuthError when not authenticated

describe("apikeys integration", () => {
  let tempConfig: TempConfigContext;
  let capturedStdout: string;
  let capturedStderr: string;
  let originalStdoutWrite: typeof process.stdout.write;
  let originalStderrWrite: typeof process.stderr.write;

  beforeEach(() => {
    tempConfig = createTempConfig();
    process.env.HOPKIN_CONFIG_DIR = tempConfig.dir;
    delete process.env.HOPKIN_API_KEY;

    capturedStdout = "";
    capturedStderr = "";
    originalStdoutWrite = process.stdout.write;
    originalStderrWrite = process.stderr.write;

    process.stdout.write = ((chunk: string | Uint8Array) => {
      capturedStdout += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
      return true;
    }) as typeof process.stdout.write;

    process.stderr.write = ((chunk: string | Uint8Array) => {
      capturedStderr += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
      return true;
    }) as typeof process.stderr.write;
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    delete process.env.HOPKIN_CONFIG_DIR;
    delete process.env.HOPKIN_API_KEY;
    tempConfig.cleanup();
  });

  describe("apikeys list", () => {
    it("requires auth - fails without credentials", async () => {
      const mod = await import("../../src/commands/apikeys/list.js");
      const cmd = mod.default;

      expect(() => {
        cmd.run!({ args: { json: false } } as never);
      }).toThrow(AuthError);
    });

    it("with auth shows not-available message", async () => {
      writeCredentials({ api_key: "test-key-123" }, tempConfig.dir);

      const mod = await import("../../src/commands/apikeys/list.js");
      const cmd = mod.default;

      cmd.run!({ args: { json: false } } as never);

      expect(capturedStderr).toContain("not yet available");
      expect(capturedStderr).toContain("https://app.hopkin.ai");
    });

    it("with auth and --json outputs JSON", async () => {
      writeCredentials({ api_key: "test-key-123" }, tempConfig.dir);

      const mod = await import("../../src/commands/apikeys/list.js");
      const cmd = mod.default;

      cmd.run!({ args: { json: true } } as never);

      const output = JSON.parse(capturedStdout.trim());
      expect(output.error).toBe("not_available");
      expect(output.message).toContain("not yet available");
    });
  });

  describe("apikeys create", () => {
    it("requires auth - fails without credentials", async () => {
      const mod = await import("../../src/commands/apikeys/create.js");
      const cmd = mod.default;

      expect(() => {
        cmd.run!({ args: { json: false } } as never);
      }).toThrow(AuthError);
    });

    it("with auth shows not-available message", async () => {
      writeCredentials({ api_key: "test-key-123" }, tempConfig.dir);

      const mod = await import("../../src/commands/apikeys/create.js");
      const cmd = mod.default;

      cmd.run!({ args: { json: false } } as never);

      expect(capturedStderr).toContain("not yet available");
    });
  });

  describe("apikeys delete", () => {
    it("requires auth - fails without credentials", async () => {
      const mod = await import("../../src/commands/apikeys/delete.js");
      const cmd = mod.default;

      expect(() => {
        cmd.run!({ args: { json: false } } as never);
      }).toThrow(AuthError);
    });

    it("with auth shows not-available message", async () => {
      writeCredentials({ api_key: "test-key-123" }, tempConfig.dir);

      const mod = await import("../../src/commands/apikeys/delete.js");
      const cmd = mod.default;

      cmd.run!({ args: { json: false } } as never);

      expect(capturedStderr).toContain("not yet available");
    });
  });
});
