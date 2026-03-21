import { describe, it, expect } from "vitest";
import { renderTable } from "./table.js";

describe("renderTable", () => {
  it("renders a basic table with headers from object keys", () => {
    const data = [
      { name: "Campaign A", status: "ACTIVE", budget: 100 },
      { name: "Campaign B", status: "PAUSED", budget: 200 },
    ];
    const result = renderTable(data);
    expect(result).toContain("name");
    expect(result).toContain("status");
    expect(result).toContain("budget");
    expect(result).toContain("Campaign A");
    expect(result).toContain("Campaign B");
  });

  it("handles empty data array", () => {
    const result = renderTable([]);
    expect(typeof result).toBe("string");
    // Should return something meaningful (empty or message)
    expect(result).toBeDefined();
  });

  it("truncates long values with ellipsis", () => {
    const longText = "A".repeat(200);
    const data = [{ value: longText }];
    const result = renderTable(data, { maxColWidth: 30 });
    expect(result).toContain("\u2026");
    expect(result).not.toContain(longText);
  });

  it("handles mixed types: string, number, null, undefined", () => {
    const data = [
      { str: "hello", num: 42, nil: null, undef: undefined },
    ];
    const result = renderTable(data);
    expect(result).toContain("hello");
    expect(result).toContain("42");
  });

  it("respects column width options", () => {
    const data = [{ col: "short" }];
    const result = renderTable(data, { maxColWidth: 10 });
    expect(typeof result).toBe("string");
  });

  it("handles data with inconsistent keys across rows", () => {
    const data = [
      { a: 1, b: 2 },
      { a: 3, c: 4 },
    ];
    const result = renderTable(data);
    expect(result).toContain("a");
    // Should handle missing keys gracefully
    expect(typeof result).toBe("string");
  });
});
