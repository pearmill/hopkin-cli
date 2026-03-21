import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProgress } from "./progress.js";

describe("createProgress", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("update() writes progress to stderr when TTY", () => {
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const originalIsTTY = process.stderr.isTTY;
    process.stderr.isTTY = true;

    try {
      const progress = createProgress();
      progress.update(3);
      expect(writeSpy).toHaveBeenCalled();
      const output = writeSpy.mock.calls[0]![0] as string;
      expect(output).toContain("3");
    } finally {
      process.stderr.isTTY = originalIsTTY;
    }
  });

  it("shows 'Fetching page X...' without total", () => {
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const originalIsTTY = process.stderr.isTTY;
    process.stderr.isTTY = true;

    try {
      const progress = createProgress();
      progress.update(2);
      const output = writeSpy.mock.calls[0]![0] as string;
      expect(output).toContain("Fetching page 2...");
    } finally {
      process.stderr.isTTY = originalIsTTY;
    }
  });

  it("shows 'Fetching page X of Y...' with total", () => {
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const originalIsTTY = process.stderr.isTTY;
    process.stderr.isTTY = true;

    try {
      const progress = createProgress();
      progress.update(2, 5);
      const output = writeSpy.mock.calls[0]![0] as string;
      expect(output).toContain("Fetching page 2 of 5...");
    } finally {
      process.stderr.isTTY = originalIsTTY;
    }
  });

  it("done() clears the progress line", () => {
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const originalIsTTY = process.stderr.isTTY;
    process.stderr.isTTY = true;

    try {
      const progress = createProgress();
      progress.done();
      const output = writeSpy.mock.calls[0]![0] as string;
      // Should clear the line (carriage return + clear)
      expect(output).toContain("\r");
    } finally {
      process.stderr.isTTY = originalIsTTY;
    }
  });

  it("does not output when stderr is not a TTY", () => {
    const writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const originalIsTTY = process.stderr.isTTY;
    process.stderr.isTTY = false;

    try {
      const progress = createProgress();
      progress.update(1);
      progress.done();
      expect(writeSpy).not.toHaveBeenCalled();
    } finally {
      process.stderr.isTTY = originalIsTTY;
    }
  });
});
