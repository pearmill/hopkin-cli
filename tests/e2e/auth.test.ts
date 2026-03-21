import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnCLI } from "../helpers/spawn-cli.js";
import { createTempConfig, type TempConfigContext } from "../helpers/temp-config.js";

describe("hopkin auth", () => {
  let ctx: TempConfigContext;

  beforeEach(() => {
    ctx = createTempConfig();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  function cli(args: string[]) {
    return spawnCLI(args, { env: { HOPKIN_CONFIG_DIR: ctx.dir } });
  }

  it("auth status with no credentials shows 'not authenticated' and exits non-zero", async () => {
    const result = await cli(["auth", "status"]);
    expect(result.stderr.toLowerCase()).toContain("not authenticated");
    expect(result.exitCode).not.toBe(0);
  });

  it("auth set-key with valid key succeeds", async () => {
    const result = await cli(["auth", "set-key", "hpk_test_123"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr.toLowerCase()).toContain("set");
  });

  it("after set-key, auth status shows authenticated", async () => {
    await cli(["auth", "set-key", "hpk_test_123"]);
    const result = await cli(["auth", "status"]);
    expect(result.stderr.toLowerCase()).toContain("authenticated");
    expect(result.exitCode).toBe(0);
  });

  it("auth logout exits 0", async () => {
    await cli(["auth", "set-key", "hpk_test_123"]);
    const result = await cli(["auth", "logout"]);
    expect(result.exitCode).toBe(0);
  });

  it("after logout, auth status shows not authenticated", async () => {
    await cli(["auth", "set-key", "hpk_test_123"]);
    await cli(["auth", "logout"]);
    const result = await cli(["auth", "status"]);
    expect(result.stderr.toLowerCase()).toContain("not authenticated");
    expect(result.exitCode).not.toBe(0);
  });

  it("auth set-key with invalid key shows error about hpk_ prefix", async () => {
    const result = await cli(["auth", "set-key", "invalid_key"]);
    expect(result.stderr.toLowerCase()).toContain("hpk_");
    expect(result.exitCode).not.toBe(0);
  });
});
