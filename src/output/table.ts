import Table from "cli-table3";

export interface TableOptions {
  maxColWidth?: number;
}

function collectHeaders(data: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  const headers: string[] = [];
  for (const row of data) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }
  return headers;
}

function formatCell(value: unknown, maxWidth?: number): string {
  if (value === null || value === undefined) {
    return "";
  }
  let str =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  if (maxWidth && str.length > maxWidth) {
    str = str.slice(0, maxWidth - 1) + "\u2026";
  }
  return str;
}

export function renderTable(
  data: Record<string, unknown>[],
  options?: TableOptions,
): string {
  if (data.length === 0) {
    return "No data";
  }

  const headers = collectHeaders(data);
  const maxColWidth = options?.maxColWidth;

  const colWidths = maxColWidth
    ? headers.map(() => maxColWidth + 2)
    : undefined;

  // Derive per-column max content widths for truncation
  const contentWidths = colWidths?.map((w) => w - 2);

  const table = new Table({
    head: headers,
    style: { head: [], border: [] },
    ...(colWidths ? { colWidths } : {}),
  });

  for (const row of data) {
    table.push(
      headers.map((h, i) =>
        formatCell(row[h], contentWidths ? contentWidths[i] : undefined),
      ),
    );
  }

  return table.toString();
}
