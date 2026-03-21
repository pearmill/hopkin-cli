import { describe, it, expect } from "vitest";
import { renderJSON } from "./json.js";

describe("renderJSON", () => {
  it("outputs valid JSON", () => {
    const data = [{ name: "Alice", age: 30 }];
    const result = renderJSON(data);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual(data);
  });

  it("filters to specified fields for arrays of objects", () => {
    const data = [
      { name: "Alice", age: 30, city: "NYC" },
      { name: "Bob", age: 25, city: "LA" },
    ];
    const result = renderJSON(data, { fields: ["name", "city"] });
    const parsed = JSON.parse(result);
    expect(parsed).toEqual([
      { name: "Alice", city: "NYC" },
      { name: "Bob", city: "LA" },
    ]);
  });

  it("pretty-prints with indentation", () => {
    const data = { name: "Alice" };
    const result = renderJSON(data, { pretty: true });
    expect(result).toContain("\n");
    expect(result).toContain("  ");
    expect(JSON.parse(result)).toEqual(data);
  });

  it("compact output by default (no pretty)", () => {
    const data = { name: "Alice" };
    const result = renderJSON(data);
    expect(result).not.toContain("\n");
  });

  it("handles nested objects", () => {
    const data = { a: { b: { c: 1 } } };
    const result = renderJSON(data);
    expect(JSON.parse(result)).toEqual(data);
  });

  it("fields option has no effect on non-array data", () => {
    const data = { name: "Alice", age: 30 };
    const result = renderJSON(data, { fields: ["name"] });
    // For non-array data, fields is ignored
    expect(JSON.parse(result)).toEqual(data);
  });

  it("handles primitive values", () => {
    expect(JSON.parse(renderJSON("hello"))).toBe("hello");
    expect(JSON.parse(renderJSON(42))).toBe(42);
    expect(JSON.parse(renderJSON(null))).toBe(null);
  });
});
