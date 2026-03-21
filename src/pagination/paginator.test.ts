import { describe, it, expect, vi } from "vitest";
import { paginate } from "./paginator.js";
import type { MCPToolCallResponse } from "../types.js";

function makeMCPResponse(
  data: Record<string, unknown>[],
  meta?: { cursor?: string; has_more?: boolean; total?: number },
): MCPToolCallResponse {
  return {
    content: [{ type: "text", text: JSON.stringify(data) }],
    _meta: meta,
  };
}

async function collectPages<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const page of gen) {
    results.push(page);
  }
  return results;
}

describe("paginate", () => {
  it("single page (has_more: false) yields one result", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValue(
        makeMCPResponse([{ id: 1 }], { has_more: false }),
      );

    const pages = await collectPages(paginate({ fetchPage }));
    expect(pages).toHaveLength(1);
    expect(pages[0]!.data).toEqual([{ id: 1 }]);
    expect(pages[0]!.has_more).toBe(false);
  });

  it("multiple pages with --all yields all pages", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(
        makeMCPResponse([{ id: 1 }], { cursor: "abc", has_more: true }),
      )
      .mockResolvedValueOnce(
        makeMCPResponse([{ id: 2 }], { cursor: "def", has_more: true }),
      )
      .mockResolvedValueOnce(
        makeMCPResponse([{ id: 3 }], { has_more: false }),
      );

    const pages = await collectPages(paginate({ fetchPage, all: true }));
    expect(pages).toHaveLength(3);
    expect(pages[0]!.data).toEqual([{ id: 1 }]);
    expect(pages[1]!.data).toEqual([{ id: 2 }]);
    expect(pages[2]!.data).toEqual([{ id: 3 }]);
  });

  it("passes cursor from previous response to next request", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(
        makeMCPResponse([{ id: 1 }], { cursor: "cursor-1", has_more: true }),
      )
      .mockResolvedValueOnce(
        makeMCPResponse([{ id: 2 }], { has_more: false }),
      );

    await collectPages(paginate({ fetchPage, all: true }));
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, undefined);
    expect(fetchPage).toHaveBeenNthCalledWith(2, "cursor-1");
  });

  it("stops when has_more is false", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(
        makeMCPResponse([{ id: 1 }], { cursor: "c1", has_more: true }),
      )
      .mockResolvedValueOnce(
        makeMCPResponse([{ id: 2 }], { has_more: false }),
      )
      .mockResolvedValueOnce(
        makeMCPResponse([{ id: 3 }], { has_more: false }),
      );

    const pages = await collectPages(paginate({ fetchPage, all: true }));
    expect(pages).toHaveLength(2);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("without --all, only yields first page even if has_more is true", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValue(
        makeMCPResponse([{ id: 1 }], { cursor: "next", has_more: true }),
      );

    const pages = await collectPages(paginate({ fetchPage, all: false }));
    expect(pages).toHaveLength(1);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(pages[0]!.has_more).toBe(true);
  });

  it("handles empty response data", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValue(makeMCPResponse([], { has_more: false }));

    const pages = await collectPages(paginate({ fetchPage }));
    expect(pages).toHaveLength(1);
    expect(pages[0]!.data).toEqual([]);
  });

  it("handles response without _meta", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      content: [{ type: "text" as const, text: JSON.stringify([{ id: 1 }]) }],
    });

    const pages = await collectPages(paginate({ fetchPage }));
    expect(pages).toHaveLength(1);
    expect(pages[0]!.data).toEqual([{ id: 1 }]);
    expect(pages[0]!.has_more).toBe(false);
  });
});
