import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { writeOutput } from "./writer.js";

describe("writeOutput", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("writes to stdout by default", () => {
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    writeOutput("hello world");
    expect(writeSpy).toHaveBeenCalledWith("hello world");
  });

  it("writes to file when output option is provided", () => {
    const tmpFile = path.join(
      import.meta.dirname ?? ".",
      "../../.tmp-test-writer-output.txt",
    );
    try {
      writeOutput("file content", { output: tmpFile });
      expect(fs.readFileSync(tmpFile, "utf-8")).toBe("file content");
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });

  it("appends to existing file when append option is true", () => {
    const tmpFile = path.join(
      import.meta.dirname ?? ".",
      "../../.tmp-test-writer-append.txt",
    );
    try {
      fs.writeFileSync(tmpFile, "existing ");
      writeOutput("appended", { output: tmpFile, append: true });
      expect(fs.readFileSync(tmpFile, "utf-8")).toBe("existing appended");
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });

  it("creates parent directories if needed", () => {
    const tmpDir = path.join(
      import.meta.dirname ?? ".",
      "../../.tmp-test-writer-nested",
    );
    const tmpFile = path.join(tmpDir, "sub", "deep", "out.txt");
    try {
      writeOutput("nested content", { output: tmpFile });
      expect(fs.readFileSync(tmpFile, "utf-8")).toBe("nested content");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
