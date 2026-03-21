import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { renderJSON } from "../../src/output/json.js";
import { renderCSV } from "../../src/output/csv.js";
import { renderTable } from "../../src/output/table.js";

const GOLDEN_DIR = path.join(import.meta.dirname, "golden");

const CAMPAIGNS_DATA: Record<string, unknown>[] = [
  {
    id: "123456",
    name: "Summer Sale 2024",
    status: "ACTIVE",
    daily_budget: 5000,
    spend: 3245,
    impressions: 45230,
    clicks: 1205,
    ctr: 2.66,
  },
  {
    id: "789012",
    name: "Brand Awareness Q4",
    status: "PAUSED",
    daily_budget: 10000,
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
  },
  {
    id: "345678",
    name: "Holiday Promo",
    status: "ACTIVE",
    daily_budget: 7500,
    spend: 6120,
    impressions: 82100,
    clicks: 3456,
    ctr: 4.21,
  },
];

describe("Golden output", () => {
  describe("JSON output", () => {
    it("renderJSON matches golden/campaigns.json", () => {
      const golden = fs.readFileSync(
        path.join(GOLDEN_DIR, "campaigns.json"),
        "utf-8",
      );
      const output = renderJSON(CAMPAIGNS_DATA, { pretty: false });
      expect(output + "\n").toBe(golden);
    });

    it("renderJSON produces valid JSON", () => {
      const output = renderJSON(CAMPAIGNS_DATA, { pretty: false });
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it("renderJSON with pretty produces indented output", () => {
      const output = renderJSON(CAMPAIGNS_DATA, { pretty: true });
      expect(output).toContain("\n");
      expect(output).toContain("  ");
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it("renderJSON pretty parses to same data as compact", () => {
      const compact = renderJSON(CAMPAIGNS_DATA, { pretty: false });
      const pretty = renderJSON(CAMPAIGNS_DATA, { pretty: true });
      expect(JSON.parse(compact)).toEqual(JSON.parse(pretty));
    });
  });

  describe("CSV output", () => {
    it("renderCSV matches golden/campaigns.csv", () => {
      const golden = fs.readFileSync(
        path.join(GOLDEN_DIR, "campaigns.csv"),
        "utf-8",
      );
      const output = renderCSV(CAMPAIGNS_DATA);
      expect(output).toBe(golden);
    });

    it("renderCSV has correct header row", () => {
      const output = renderCSV(CAMPAIGNS_DATA);
      const firstLine = output.split("\n")[0];
      expect(firstLine).toBe(
        "id,name,status,daily_budget,spend,impressions,clicks,ctr",
      );
    });

    it("renderCSV has correct number of data rows", () => {
      const output = renderCSV(CAMPAIGNS_DATA);
      const lines = output.trim().split("\n");
      // 1 header + 3 data rows
      expect(lines).toHaveLength(4);
    });
  });

  describe("TSV output", () => {
    it("renderCSV with tab delimiter matches golden/campaigns.tsv", () => {
      const golden = fs.readFileSync(
        path.join(GOLDEN_DIR, "campaigns.tsv"),
        "utf-8",
      );
      const output = renderCSV(CAMPAIGNS_DATA, { delimiter: "\t" });
      expect(output).toBe(golden);
    });

    it("TSV uses tabs not commas", () => {
      const output = renderCSV(CAMPAIGNS_DATA, { delimiter: "\t" });
      const firstLine = output.split("\n")[0];
      expect(firstLine).toContain("\t");
      expect(firstLine).not.toContain(",");
    });
  });

  describe("Table output", () => {
    it("renderTable produces non-empty output for campaign data", () => {
      const output = renderTable(CAMPAIGNS_DATA);
      expect(output.length).toBeGreaterThan(0);
    });

    it("renderTable contains all header fields", () => {
      const output = renderTable(CAMPAIGNS_DATA);
      for (const key of Object.keys(CAMPAIGNS_DATA[0])) {
        expect(output).toContain(key);
      }
    });

    it("renderTable contains data values", () => {
      const output = renderTable(CAMPAIGNS_DATA);
      expect(output).toContain("Summer Sale 2024");
      expect(output).toContain("Brand Awareness Q4");
      expect(output).toContain("Holiday Promo");
      expect(output).toContain("123456");
      expect(output).toContain("ACTIVE");
      expect(output).toContain("PAUSED");
    });

    it("renderTable returns 'No data' for empty array", () => {
      const output = renderTable([]);
      expect(output).toBe("No data");
    });
  });

  describe("Empty data", () => {
    it("renderJSON with empty array produces []", () => {
      const output = renderJSON([], { pretty: false });
      expect(output).toBe("[]");
    });

    it("renderCSV with empty array produces empty string", () => {
      const output = renderCSV([]);
      expect(output).toBe("");
    });
  });
});
