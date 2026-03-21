import type { MCPToolCallResponse, PageResult } from "../types.js";

export interface PaginatorOptions {
  fetchPage: (cursor?: string) => Promise<MCPToolCallResponse>;
  limit?: number;
  all?: boolean;
}

function parseResponse(response: MCPToolCallResponse): PageResult {
  // Prefer structuredContent — it has typed data + pagination info
  if (response.structuredContent) {
    const sc = response.structuredContent;
    const data = Array.isArray(sc.data) ? sc.data : [];
    const cursor = sc.nextCursor as string | undefined;
    const has_more = !!cursor;
    const total = typeof sc.count === "number" ? sc.count : undefined;
    return { data, cursor, has_more, total };
  }

  const text = response.content[0]?.text ?? "[]";
  const data = JSON.parse(text) as Record<string, unknown>[];

  const cursor = response._meta?.cursor;
  const has_more = response._meta?.has_more ?? false;
  const total = response._meta?.total;

  return { data, cursor, has_more, total };
}

export async function* paginate(
  options: PaginatorOptions,
): AsyncGenerator<PageResult> {
  const { fetchPage, all = false } = options;

  let cursor: string | undefined;

  // Fetch first page
  const firstResponse = await fetchPage(cursor);
  const firstPage = parseResponse(firstResponse);
  yield firstPage;

  if (!all) return;

  cursor = firstPage.cursor;
  let hasMore = firstPage.has_more;

  while (hasMore && cursor) {
    const response = await fetchPage(cursor);
    const page = parseResponse(response);
    yield page;

    cursor = page.cursor;
    hasMore = page.has_more;
  }
}
