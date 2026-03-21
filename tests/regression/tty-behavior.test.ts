import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { detectFormat } from "../../src/output/formatter.js";
import { isColorEnabled } from "../../src/util/tty.js";

describe("TTY behavior", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.NO_COLOR = process.env.NO_COLOR;
    savedEnv.FORCE_COLOR = process.env.FORCE_COLOR;
    savedEnv.HOPKIN_NO_COLOR = process.env.HOPKIN_NO_COLOR;
  });

  afterEach(() => {
    // Restore env vars
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  describe("detectFormat", () => {
    it("piped stdout (not TTY) returns json", () => {
      const result = detectFormat({ isTTY: false });
      expect(result).toBe("json");
    });

    it("TTY stdout returns table", () => {
      const result = detectFormat({ isTTY: true });
      expect(result).toBe("table");
    });

    it("--json flag always returns json regardless of TTY", () => {
      const result = detectFormat({ isTTY: true, json: true });
      expect(result).toBe("json");
    });

    it("--json flag returns json when not TTY too", () => {
      const result = detectFormat({ isTTY: false, json: true });
      expect(result).toBe("json");
    });

    it("explicit format overrides TTY detection", () => {
      const result = detectFormat({ isTTY: true, format: "csv" });
      expect(result).toBe("csv");
    });

    it("explicit format overrides non-TTY default", () => {
      const result = detectFormat({ isTTY: false, format: "table" });
      expect(result).toBe("table");
    });

    it("explicit format overrides json flag", () => {
      const result = detectFormat({ isTTY: true, json: true, format: "tsv" });
      expect(result).toBe("tsv");
    });
  });

  describe("isColorEnabled", () => {
    it("NO_COLOR=1 disables color", () => {
      delete process.env.FORCE_COLOR;
      process.env.NO_COLOR = "1";
      expect(isColorEnabled()).toBe(false);
    });

    it("HOPKIN_NO_COLOR disables color", () => {
      delete process.env.FORCE_COLOR;
      delete process.env.NO_COLOR;
      process.env.HOPKIN_NO_COLOR = "1";
      expect(isColorEnabled()).toBe(false);
    });

    it("FORCE_COLOR=1 enables color even when NO_COLOR is set", () => {
      process.env.FORCE_COLOR = "1";
      process.env.NO_COLOR = "1";
      // FORCE_COLOR is checked first
      expect(isColorEnabled()).toBe(true);
    });

    it("FORCE_COLOR=1 enables color", () => {
      process.env.FORCE_COLOR = "1";
      delete process.env.NO_COLOR;
      delete process.env.HOPKIN_NO_COLOR;
      expect(isColorEnabled()).toBe(true);
    });
  });
});
