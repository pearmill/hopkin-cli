import type { OutputFormat, PageResult } from "../types.js";
import { writeOutput } from "../output/writer.js";
import { renderCSV } from "../output/csv.js";
import { renderTable } from "../output/table.js";

export async function streamPages(
  pages: AsyncGenerator<PageResult>,
  format: OutputFormat,
  options?: { fields?: string[]; output?: string },
): Promise<void> {
  const writeOpts = options?.output ? { output: options.output } : undefined;

  switch (format) {
    case "json":
      await streamJSON(pages, writeOpts);
      break;
    case "csv":
    case "tsv":
      await streamCSV(pages, format, options?.fields, writeOpts);
      break;
    case "table":
      await streamTable(pages, options?.fields, writeOpts);
      break;
  }
}

async function streamJSON(
  pages: AsyncGenerator<PageResult>,
  writeOpts?: { output?: string },
): Promise<void> {
  writeOutput("[", writeOpts);
  let first = true;

  for await (const page of pages) {
    for (const item of page.data) {
      if (!first) {
        writeOutput(",", writeOpts ? { ...writeOpts, append: true } : undefined);
      }
      const json = JSON.stringify(item);
      writeOutput(
        json,
        writeOpts ? { ...writeOpts, append: true } : undefined,
      );
      first = false;
    }
  }

  writeOutput("]", writeOpts ? { ...writeOpts, append: true } : undefined);
}

async function streamCSV(
  pages: AsyncGenerator<PageResult>,
  format: "csv" | "tsv",
  fields?: string[],
  writeOpts?: { output?: string },
): Promise<void> {
  let headerWritten = false;
  const delimiter = format === "tsv" ? "\t" : ",";

  for await (const page of pages) {
    if (page.data.length === 0) continue;

    if (!headerWritten) {
      // First page: render with header
      const csv = renderCSV(page.data, { delimiter, fields });
      writeOutput(csv, writeOpts);
      headerWritten = true;
    } else {
      // Subsequent pages: render full CSV then strip the header line
      const csv = renderCSV(page.data, { delimiter, fields });
      const lines = csv.split("\n");
      // Remove header (first line), keep the rest
      const dataLines = lines.slice(1).join("\n");
      if (dataLines) {
        writeOutput(
          dataLines,
          writeOpts ? { ...writeOpts, append: true } : undefined,
        );
      }
    }
  }
}

async function streamTable(
  pages: AsyncGenerator<PageResult>,
  fields?: string[],
  writeOpts?: { output?: string },
): Promise<void> {
  // Collect all data from all pages, then render as a single table
  const allData: Record<string, unknown>[] = [];

  for await (const page of pages) {
    allData.push(...page.data);
  }

  const output = renderTable(allData);
  writeOutput(output, writeOpts);
}
