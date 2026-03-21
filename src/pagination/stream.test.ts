import { describe, it, expect, vi, beforeEach } from "vitest";
import { streamPages } from "./stream.js";
import type { PageResult } from "../types.js";

async function* makePages(
  ...pages: PageResult[]
): AsyncGenerator<PageResult> {
  for (const page of pages) {
    yield page;
  }
}

describe("streamPages", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("JSON streaming produces valid JSON across multiple pages", async () => {
    const chunks: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      chunks.push(String(chunk));
      return true;
    });

    const pages = makePages(
      { data: [{ id: 1 }, { id: 2 }], has_more: true, cursor: "c1" },
      { data: [{ id: 3 }], has_more: false },
    );

    await streamPages(pages, "json");
    const combined = chunks.join("");
    const parsed = JSON.parse(combined);
    expect(parsed).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it("CSV streaming has header only once", async () => {
    const chunks: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      chunks.push(String(chunk));
      return true;
    });

    const pages = makePages(
      {
        data: [{ name: "Alice", age: 30 }],
        has_more: true,
        cursor: "c1",
      },
      {
        data: [{ name: "Bob", age: 25 }],
        has_more: false,
      },
    );

    await streamPages(pages, "csv");
    const combined = chunks.join("");
    const lines = combined.trim().split("\n");
    // Header should appear exactly once
    const headerCount = lines.filter((l) => l.includes("name") && l.includes("age")).length;
    expect(headerCount).toBe(1);
    // Should have header + 2 data rows
    expect(lines).toHaveLength(3);
  });

  it("table streaming renders all pages", async () => {
    const chunks: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      chunks.push(String(chunk));
      return true;
    });

    const pages = makePages(
      { data: [{ id: 1 }], has_more: true, cursor: "c1" },
      { data: [{ id: 2 }], has_more: false },
    );

    await streamPages(pages, "table");
    const combined = chunks.join("");
    expect(combined).toContain("1");
    expect(combined).toContain("2");
  });

  it("single page works correctly", async () => {
    const chunks: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      chunks.push(String(chunk));
      return true;
    });

    const pages = makePages({
      data: [{ name: "Alice" }],
      has_more: false,
    });

    await streamPages(pages, "json");
    const combined = chunks.join("");
    const parsed = JSON.parse(combined);
    expect(parsed).toEqual([{ name: "Alice" }]);
  });

  it("writes to stdout by default", async () => {
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    const pages = makePages({
      data: [{ id: 1 }],
      has_more: false,
    });

    await streamPages(pages, "json");
    expect(writeSpy).toHaveBeenCalled();
  });
});
