import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { streamPages } from "../../src/pagination/stream.js";
import type { PageResult } from "../../src/types.js";

function captureStdout() {
  let captured = "";
  const originalWrite = process.stdout.write;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    captured += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
    return true;
  }) as typeof process.stdout.write;

  return {
    get output() {
      return captured;
    },
    restore() {
      process.stdout.write = originalWrite;
    },
  };
}

async function* singlePage(data: Record<string, unknown>[]): AsyncGenerator<PageResult> {
  yield { data, has_more: false };
}

async function* multiplePages(
  pages: Record<string, unknown>[][],
): AsyncGenerator<PageResult> {
  for (let i = 0; i < pages.length; i++) {
    yield {
      data: pages[i],
      has_more: i < pages.length - 1,
      cursor: i < pages.length - 1 ? `page${i + 2}` : undefined,
    };
  }
}

async function* emptyPages(): AsyncGenerator<PageResult> {
  yield { data: [], has_more: false };
}

describe("Streaming JSON", () => {
  let capture: ReturnType<typeof captureStdout>;

  beforeEach(() => {
    capture = captureStdout();
  });

  afterEach(() => {
    capture.restore();
  });

  it("single page produces valid JSON", async () => {
    const data = [
      { id: "1", name: "Campaign A" },
      { id: "2", name: "Campaign B" },
    ];

    await streamPages(singlePage(data), "json");

    const output = capture.output;
    expect(() => JSON.parse(output)).not.toThrow();
    const parsed = JSON.parse(output);
    expect(parsed).toEqual(data);
  });

  it("multiple pages streamed produces valid JSON", async () => {
    const page1 = [{ id: "1", name: "A" }];
    const page2 = [{ id: "2", name: "B" }];
    const page3 = [{ id: "3", name: "C" }];

    await streamPages(multiplePages([page1, page2, page3]), "json");

    const output = capture.output;
    expect(() => JSON.parse(output)).not.toThrow();
    const parsed = JSON.parse(output);
    expect(parsed).toEqual([...page1, ...page2, ...page3]);
  });

  it("empty data produces valid JSON ([])", async () => {
    await streamPages(emptyPages(), "json");

    const output = capture.output;
    expect(() => JSON.parse(output)).not.toThrow();
    const parsed = JSON.parse(output);
    expect(parsed).toEqual([]);
  });

  it("single item page produces valid JSON", async () => {
    const data = [{ id: "1" }];

    await streamPages(singlePage(data), "json");

    const parsed = JSON.parse(capture.output);
    expect(parsed).toEqual(data);
  });

  it("many pages with many items produces valid JSON", async () => {
    const pages = Array.from({ length: 5 }, (_, i) =>
      Array.from({ length: 10 }, (_, j) => ({
        id: String(i * 10 + j),
        value: `item-${i}-${j}`,
      })),
    );

    await streamPages(multiplePages(pages), "json");

    const parsed = JSON.parse(capture.output);
    expect(parsed).toHaveLength(50);
    expect(parsed[0]).toEqual({ id: "0", value: "item-0-0" });
    expect(parsed[49]).toEqual({ id: "49", value: "item-4-9" });
  });
});
