import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { COLORS, colorize, supportsColor } from "./colors.js";

describe("COLORS", () => {
  it("has expected brand color hex values", () => {
    expect(COLORS.primary).toBe("#EA580C");
    expect(COLORS.success).toBe("#22C55E");
    expect(COLORS.warning).toBe("#EAB308");
    expect(COLORS.error).toBe("#EF4444");
    expect(COLORS.info).toBe("#3B82F6");
    expect(COLORS.muted).toBe("#6B7280");
  });
});

describe("colorize", () => {
  it("returns a string containing the original text", async () => {
    const result = await colorize("hello", "primary");
    expect(result).toContain("hello");
  });

  it("returns a string for each color key", async () => {
    for (const key of Object.keys(COLORS) as (keyof typeof COLORS)[]) {
      const result = await colorize("test", key);
      expect(typeof result).toBe("string");
      expect(result).toContain("test");
    }
  });

  it("handles empty string", async () => {
    const result = await colorize("", "primary");
    expect(typeof result).toBe("string");
  });
});

describe("supportsColor", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns false when NO_COLOR is set", () => {
    process.env.NO_COLOR = "1";
    expect(supportsColor()).toBe(false);
  });

  it("returns false when NO_COLOR is empty string (still set)", () => {
    process.env.NO_COLOR = "";
    expect(supportsColor()).toBe(false);
  });

  it("returns true when FORCE_COLOR is set and NO_COLOR is not", () => {
    delete process.env.NO_COLOR;
    process.env.FORCE_COLOR = "1";
    expect(supportsColor()).toBe(true);
  });
});
