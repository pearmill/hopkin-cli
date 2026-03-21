import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnCLI } from "../helpers/spawn-cli.js";
import { createTempConfig, type TempConfigContext } from "../helpers/temp-config.js";

describe("hopkin tools", () => {
  let ctx: TempConfigContext;

  beforeEach(() => {
    ctx = createTempConfig();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it("tools list with no cache shows helpful message and exits 0", async () => {
    const result = await spawnCLI(["tools", "list"], {
      env: { HOPKIN_CONFIG_DIR: ctx.dir },
    });
    const combined = result.stdout + result.stderr;
    expect(combined.toLowerCase()).toContain("no tool cache");
    expect(result.exitCode).toBe(0);
  });
});
