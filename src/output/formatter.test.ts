import { describe, it, expect } from "vitest";
import { detectFormat, formatOutput } from "./formatter.js";

describe("detectFormat", () => {
  it("returns 'table' for TTY with no flags", () => {
    expect(detectFormat({ isTTY: true })).toBe("table");
  });

  it("returns 'json' when piped (no TTY)", () => {
    expect(detectFormat({ isTTY: false })).toBe("json");
  });

  it("returns 'json' when --json flag is set", () => {
    expect(detectFormat({ isTTY: true, json: true })).toBe("json");
  });

  it("returns 'csv' when --format csv is specified", () => {
    expect(detectFormat({ isTTY: true, format: "csv" })).toBe("csv");
  });

  it("returns 'tsv' when --format tsv is specified", () => {
    expect(detectFormat({ isTTY: true, format: "tsv" })).toBe("tsv");
  });

  it("returns 'table' when --format table is specified", () => {
    expect(detectFormat({ isTTY: false, format: "table" })).toBe("table");
  });

  it("--format takes precedence over --json", () => {
    expect(detectFormat({ isTTY: true, json: true, format: "csv" })).toBe("csv");
  });

  it("--format takes precedence over TTY detection", () => {
    expect(detectFormat({ isTTY: false, format: "table" })).toBe("table");
  });
});

describe("formatOutput", () => {
  const data = [
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
  ];

  it("formats as table", () => {
    const result = formatOutput(data, "table");
    expect(result).toContain("name");
    expect(result).toContain("Alice");
  });

  it("formats as json", () => {
    const result = formatOutput(data, "json");
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("formats as csv", () => {
    const result = formatOutput(data, "csv");
    expect(result).toContain("name,age");
  });

  it("formats as tsv", () => {
    const result = formatOutput(data, "tsv");
    expect(result).toContain("name\tage");
  });

  it("passes fields option through to json", () => {
    const result = formatOutput(data, "json", { fields: ["name"] });
    const parsed = JSON.parse(result);
    expect(parsed[0]).toEqual({ name: "Alice" });
    expect(parsed[0]).not.toHaveProperty("age");
  });
});
