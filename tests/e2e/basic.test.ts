import { describe, it, expect } from "vitest";
import { spawnCLI } from "../helpers/spawn-cli.js";
import { VERSION } from "../../src/constants.js";

describe("hopkin basic CLI", () => {
  it("--version prints version string and exits 0", async () => {
    const result = await spawnCLI(["--version"]);
    expect(result.stdout.trim()).toBe(VERSION);
    expect(result.exitCode).toBe(0);
  });

  it("-v prints version string and exits 0", async () => {
    const result = await spawnCLI(["-v"]);
    expect(result.stdout.trim()).toBe(VERSION);
    expect(result.exitCode).toBe(0);
  });

  it("--help prints help text containing 'Hopkin' and exits 0", async () => {
    const result = await spawnCLI(["--help"]);
    const combined = result.stdout + result.stderr;
    expect(combined).toContain("Hopkin");
    expect(result.exitCode).toBe(0);
  });

  it("-h prints help text and exits 0", async () => {
    const result = await spawnCLI(["-h"]);
    const combined = result.stdout + result.stderr;
    expect(combined).toContain("Hopkin");
    expect(result.exitCode).toBe(0);
  });

  it("unknown command exits with non-zero and shows error", async () => {
    const result = await spawnCLI(["nonexistent"]);
    const combined = result.stdout + result.stderr;
    expect(combined.toLowerCase()).toMatch(/error|unknown|invalid/i);
    expect(result.exitCode).not.toBe(0);
  });
});
