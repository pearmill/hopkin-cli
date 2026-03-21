import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnCLI } from "../helpers/spawn-cli.js";
import { createTempConfig, type TempConfigContext } from "../helpers/temp-config.js";

describe("hopkin config", () => {
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

  it("config set output_format json exits 0", async () => {
    const result = await cli(["config", "set", "output_format", "json"]);
    expect(result.exitCode).toBe(0);
  });

  it("config get output_format prints json after set", async () => {
    await cli(["config", "set", "output_format", "json"]);
    const result = await cli(["config", "get", "output_format"]);
    expect(result.stdout.trim()).toBe("json");
    expect(result.exitCode).toBe(0);
  });

  it("config set meta.default_account 123 exits 0", async () => {
    const result = await cli(["config", "set", "meta.default_account", "123"]);
    expect(result.exitCode).toBe(0);
  });

  it("config get meta prints JSON with default_account", async () => {
    await cli(["config", "set", "meta.default_account", "123"]);
    const result = await cli(["config", "get", "meta"]);
    const parsed = JSON.parse(result.stdout.trim());
    expect(parsed.default_account).toBe("123");
    expect(result.exitCode).toBe(0);
  });

  it("config unset meta.default_account exits 0", async () => {
    await cli(["config", "set", "meta.default_account", "123"]);
    const result = await cli(["config", "unset", "meta.default_account"]);
    expect(result.exitCode).toBe(0);
  });

  it("config get meta.default_account prints empty after unset", async () => {
    await cli(["config", "set", "meta.default_account", "123"]);
    await cli(["config", "unset", "meta.default_account"]);
    const result = await cli(["config", "get", "meta.default_account"]);
    expect(result.stdout.trim()).toBe("");
    expect(result.exitCode).toBe(0);
  });
});
