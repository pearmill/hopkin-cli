import { describe, it, expect } from "vitest";
import { renderCSV } from "./csv.js";

describe("renderCSV", () => {
  it("renders basic CSV with header row", () => {
    const data = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const result = renderCSV(data);
    const lines = result.trim().split("\n");
    expect(lines[0]).toBe("name,age");
    expect(lines[1]).toBe("Alice,30");
    expect(lines[2]).toBe("Bob,25");
  });

  it("quotes values containing commas", () => {
    const data = [{ name: "Doe, Jane", city: "NYC" }];
    const result = renderCSV(data);
    const lines = result.trim().split("\n");
    expect(lines[1]).toBe('"Doe, Jane",NYC');
  });

  it("doubles quotes within values (RFC 4180)", () => {
    const data = [{ name: 'She said "hello"' }];
    const result = renderCSV(data);
    const lines = result.trim().split("\n");
    expect(lines[1]).toBe('"She said ""hello"""');
  });

  it("handles newlines in values", () => {
    const data = [{ note: "line1\nline2" }];
    const result = renderCSV(data);
    // Value with newline should be quoted
    expect(result).toContain('"line1\nline2"');
  });

  it("uses tab delimiter in TSV mode", () => {
    const data = [
      { name: "Alice", age: 30 },
    ];
    const result = renderCSV(data, { delimiter: "\t" });
    const lines = result.trim().split("\n");
    expect(lines[0]).toBe("name\tage");
    expect(lines[1]).toBe("Alice\t30");
  });

  it("filters columns with fields option", () => {
    const data = [
      { name: "Alice", age: 30, city: "NYC" },
    ];
    const result = renderCSV(data, { fields: ["name", "city"] });
    const lines = result.trim().split("\n");
    expect(lines[0]).toBe("name,city");
    expect(lines[1]).toBe("Alice,NYC");
  });

  it("handles empty data array", () => {
    const result = renderCSV([]);
    expect(typeof result).toBe("string");
  });

  it("handles null and undefined values", () => {
    const data = [{ a: null, b: undefined, c: "ok" }];
    const result = renderCSV(data);
    const lines = result.trim().split("\n");
    expect(lines[0]).toBe("a,b,c");
    // null/undefined should render as empty
    expect(lines[1]).toBe(",,ok");
  });
});
