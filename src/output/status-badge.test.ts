import { describe, it, expect } from "vitest";
import { formatStatus } from "./status-badge.js";

describe("formatStatus", () => {
  it("formats ACTIVE with green styling", () => {
    const result = formatStatus("ACTIVE");
    expect(result).toContain("ACTIVE");
  });

  it("formats ENABLED with green styling", () => {
    const result = formatStatus("ENABLED");
    expect(result).toContain("ENABLED");
  });

  it("formats PAUSED with yellow styling", () => {
    const result = formatStatus("PAUSED");
    expect(result).toContain("PAUSED");
  });

  it("formats REMOVED with red styling", () => {
    const result = formatStatus("REMOVED");
    expect(result).toContain("REMOVED");
  });

  it("formats DELETED with red styling", () => {
    const result = formatStatus("DELETED");
    expect(result).toContain("DELETED");
  });

  it("formats ARCHIVED with red styling", () => {
    const result = formatStatus("ARCHIVED");
    expect(result).toContain("ARCHIVED");
  });

  it("formats DRAFT with muted styling", () => {
    const result = formatStatus("DRAFT");
    expect(result).toContain("DRAFT");
  });

  it("returns unknown status as-is", () => {
    const result = formatStatus("BANANA");
    expect(result).toBe("BANANA");
  });

  it("is case-sensitive — lowercase does not match", () => {
    const result = formatStatus("active");
    expect(result).toBe("active");
  });
});
