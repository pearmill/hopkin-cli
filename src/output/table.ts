import Table from "cli-table3";

export interface TableOptions {
  maxColWidth?: number;
  terminalWidth?: number;
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
  let str = String(value);
  if (maxWidth && str.length > maxWidth) {
    str = str.slice(0, maxWidth - 1) + "\u2026";
  }
  return str;
}

/**
 * Compute column widths that fit within the terminal.
 * Strategy: measure natural widths, then shrink the widest columns to fit.
 */
function computeColWidths(
  headers: string[],
  data: Record<string, unknown>[],
  termWidth: number,
): number[] | undefined {
  // Measure natural width of each column (header + data)
  const naturalWidths = headers.map((h) => {
    let max = h.length;
    for (const row of data) {
      const val = row[h];
      const len = val == null ? 0 : String(val).length;
      if (len > max) max = len;
    }
    return max;
  });

  // Border overhead: | col | col | col | = (numCols + 1) pipes + 2 spaces per col
  const borderOverhead = headers.length + 1 + headers.length * 2;
  const availableWidth = termWidth - borderOverhead;

  const totalNatural = naturalWidths.reduce((a, b) => a + b, 0);
  if (totalNatural <= availableWidth) {
    return undefined; // fits naturally
  }

  // Distribute width: cap each column at a max, then give remainder to long columns
  const maxPerCol = Math.floor(availableWidth / headers.length);
  const minWidth = 10;

  // First pass: short columns get their natural width, long columns get capped
  const colWidths = naturalWidths.map((w) =>
    Math.max(minWidth, Math.min(w, maxPerCol)),
  );

  // Second pass: distribute leftover space to columns that were capped
  const used = colWidths.reduce((a, b) => a + b, 0);
  let remaining = availableWidth - used;
  if (remaining > 0) {
    const cappedIndices = naturalWidths
      .map((w, i) => (w > maxPerCol ? i : -1))
      .filter((i) => i >= 0);
    if (cappedIndices.length > 0) {
      const extra = Math.floor(remaining / cappedIndices.length);
      for (const i of cappedIndices) {
        colWidths[i] += extra;
        remaining -= extra;
      }
    }
  }

  // cli-table3 colWidths includes padding (2 chars), so add 2
  return colWidths.map((w) => w + 2);
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
  const termWidth = options?.terminalWidth ?? process.stdout.columns ?? 120;

  const colWidths = maxColWidth
    ? headers.map(() => maxColWidth + 2)
    : computeColWidths(headers, data, termWidth);

  // Derive per-column max content widths for truncation
  const contentWidths = colWidths?.map((w) => w - 2);

  const table = new Table({
    head: headers,
    style: { head: [], border: [] },
    wordWrap: true,
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
