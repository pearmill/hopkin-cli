import { describe, it, expect } from "vitest";
import { spawnCLI } from "../helpers/spawn-cli.js";

describe("hopkin completion", () => {
  it("completion bash outputs bash completion script", async () => {
    const result = await spawnCLI(["completion", "bash"]);
    expect(result.stdout).toContain("complete -F");
    expect(result.exitCode).toBe(0);
  });

  it("completion zsh outputs zsh completion script", async () => {
    const result = await spawnCLI(["completion", "zsh"]);
    expect(result.stdout).toContain("compdef");
    expect(result.exitCode).toBe(0);
  });

  it("completion fish outputs fish completion script", async () => {
    const result = await spawnCLI(["completion", "fish"]);
    expect(result.stdout).toContain("complete -c hopkin");
    expect(result.exitCode).toBe(0);
  });
});
