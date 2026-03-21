export interface CSVOptions {
  delimiter?: string;
  fields?: string[];
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

function escapeField(value: unknown, delimiter: string): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  const needsQuoting =
    str.includes(delimiter) || str.includes('"') || str.includes("\n") || str.includes("\r");
  if (needsQuoting) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function renderCSV(
  data: Record<string, unknown>[],
  options?: CSVOptions,
): string {
  const delimiter = options?.delimiter ?? ",";

  if (data.length === 0) {
    return "";
  }

  const allHeaders = collectHeaders(data);
  const headers = options?.fields
    ? options.fields.filter((f) => allHeaders.includes(f))
    : allHeaders;

  const lines: string[] = [];
  lines.push(headers.join(delimiter));

  for (const row of data) {
    lines.push(
      headers.map((h) => escapeField(row[h], delimiter)).join(delimiter),
    );
  }

  return lines.join("\n") + "\n";
}
