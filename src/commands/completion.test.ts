import { describe, it, expect } from "vitest";
import { generateCompletion } from "./completion.js";

describe("completion", () => {
  describe("bash", () => {
    it("generates valid bash completion with complete -F", () => {
      const output = generateCompletion("bash");
      expect(output).toContain("complete -F");
      expect(output).toContain("_hopkin_completions");
    });

    it("includes top-level commands", () => {
      const output = generateCompletion("bash");
      expect(output).toContain("auth");
      expect(output).toContain("config");
      expect(output).toContain("tools");
      expect(output).toContain("apikeys");
      expect(output).toContain("completion");
      expect(output).toContain("meta");
      expect(output).toContain("google");
    });

    it("includes subcommands for auth", () => {
      const output = generateCompletion("bash");
      expect(output).toContain("login");
      expect(output).toContain("logout");
    });
  });

  describe("zsh", () => {
    it("generates valid zsh completion with compdef", () => {
      const output = generateCompletion("zsh");
      expect(output).toContain("compdef");
      expect(output).toContain("_hopkin");
    });

    it("includes top-level commands", () => {
      const output = generateCompletion("zsh");
      expect(output).toContain("auth");
      expect(output).toContain("config");
      expect(output).toContain("tools");
      expect(output).toContain("apikeys");
      expect(output).toContain("completion");
    });
  });

  describe("fish", () => {
    it("generates valid fish completion with complete -c hopkin", () => {
      const output = generateCompletion("fish");
      expect(output).toContain("complete -c hopkin");
    });

    it("includes top-level commands", () => {
      const output = generateCompletion("fish");
      expect(output).toContain("auth");
      expect(output).toContain("config");
      expect(output).toContain("tools");
      expect(output).toContain("apikeys");
      expect(output).toContain("completion");
    });

    it("includes subcommands", () => {
      const output = generateCompletion("fish");
      expect(output).toContain("login");
      expect(output).toContain("refresh");
    });
  });

  describe("error handling", () => {
    it("throws for unsupported shell", () => {
      expect(() => generateCompletion("powershell")).toThrow(
        /Unsupported shell.*powershell/,
      );
    });

    it("error message lists supported shells", () => {
      expect(() => generateCompletion("ksh")).toThrow(/bash.*zsh.*fish/);
    });
  });
});
