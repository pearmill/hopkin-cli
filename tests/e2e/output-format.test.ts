import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnCLI } from "../helpers/spawn-cli.js";
import { createTempConfig, type TempConfigContext } from "../helpers/temp-config.js";

describe("hopkin output format", () => {
  let ctx: TempConfigContext;

  beforeEach(() => {
    ctx = createTempConfig();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it("--json flag on auth status produces valid JSON output", async () => {
    const result = await spawnCLI(["auth", "status", "--json"], {
      env: { HOPKIN_CONFIG_DIR: ctx.dir },
    });
    const parsed = JSON.parse(result.stdout.trim());
    expect(parsed).toHaveProperty("authenticated");
    expect(typeof parsed.authenticated).toBe("boolean");
  });
});
