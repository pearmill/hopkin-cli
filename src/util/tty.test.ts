import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { isTTY, isColorEnabled, getTerminalWidth } from "./tty.js";

describe("util/tty", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NO_COLOR;
    delete process.env.HOPKIN_NO_COLOR;
    delete process.env.FORCE_COLOR;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("isTTY", () => {
    it("returns a boolean", () => {
      expect(typeof isTTY()).toBe("boolean");
    });
  });

  describe("isColorEnabled", () => {
    it("NO_COLOR env var disables color", () => {
      process.env.NO_COLOR = "1";
      expect(isColorEnabled()).toBe(false);
    });

    it("HOPKIN_NO_COLOR env var disables color", () => {
      process.env.HOPKIN_NO_COLOR = "1";
      expect(isColorEnabled()).toBe(false);
    });

    it("FORCE_COLOR env var enables color", () => {
      process.env.FORCE_COLOR = "1";
      expect(isColorEnabled()).toBe(true);
    });

    it("FORCE_COLOR takes precedence over NO_COLOR", () => {
      process.env.NO_COLOR = "1";
      process.env.FORCE_COLOR = "1";
      expect(isColorEnabled()).toBe(true);
    });
  });

  describe("getTerminalWidth", () => {
    it("returns terminal width or default 80", () => {
      const width = getTerminalWidth();
      expect(typeof width).toBe("number");
      expect(width).toBeGreaterThanOrEqual(40);
    });

    it("returns 80 when stdout is not a TTY", () => {
      const originalColumns = process.stdout.columns;
      // When columns is undefined (not a TTY), should return 80
      Object.defineProperty(process.stdout, "columns", {
        value: undefined,
        configurable: true,
      });
      expect(getTerminalWidth()).toBe(80);
      Object.defineProperty(process.stdout, "columns", {
        value: originalColumns,
        configurable: true,
      });
    });
  });
});
