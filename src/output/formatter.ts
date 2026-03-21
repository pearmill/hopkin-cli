import type { OutputFormat } from "../types.js";
import { renderTable } from "./table.js";
import { renderCSV } from "./csv.js";
import { renderJSON } from "./json.js";

export interface FormatOptions {
  isTTY: boolean;
  json?: boolean;
  format?: OutputFormat;
}

export interface FormatSpecificOptions {
  fields?: string[];
  maxColWidth?: number;
  pretty?: boolean;
}

export function detectFormat(options: FormatOptions): OutputFormat {
  if (options.format) {
    return options.format;
  }
  if (options.json) {
    return "json";
  }
  return options.isTTY ? "table" : "json";
}

export function formatOutput(
  data: Record<string, unknown>[],
  format: OutputFormat,
  options?: FormatSpecificOptions,
): string {
  switch (format) {
    case "table":
      return renderTable(data, { maxColWidth: options?.maxColWidth });
    case "json":
      return renderJSON(data, {
        fields: options?.fields,
        pretty: options?.pretty ?? true,
      });
    case "csv":
      return renderCSV(data, { fields: options?.fields });
    case "tsv":
      return renderCSV(data, { delimiter: "\t", fields: options?.fields });
  }
}
