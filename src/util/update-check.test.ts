import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// Mock constants before importing
vi.mock("../constants.js", () => ({
  VERSION: "0.1.0",
  CONFIG_DIR_NAME: "hopkin",
}));

// Mock config/paths to use a temp dir
const mockConfigDir = path.join(import.meta.dirname ?? ".", ".test-config-update-check");

vi.mock("../config/paths.js", () => ({
  getConfigDir: () => mockConfigDir,
  ensureConfigDir: () => fs.mkdirSync(mockConfigDir, { recursive: true }),
}));

describe("util/update-check", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let originalIsTTY: boolean | undefined;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    });

    // Clean up temp dir
    try {
      fs.rmSync(mockConfigDir, { recursive: true, force: true });
    } catch {
      // ignore
    }

    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    fetchSpy.mockRestore();
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      configurable: true,
    });

    try {
      fs.rmSync(mockConfigDir, { recursive: true, force: true });
    } catch {
      // ignore
    }

    vi.resetModules();
  });

  it("writes update message when newer version available", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ version: "1.0.0" }), { status: 200 }),
    );

    const { checkForUpdate } = await import("./update-check.js");
    await checkForUpdate();

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining("Update available: 0.1.0"),
    );
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining("1.0.0"),
    );
  });

  it("no output when version is same", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ version: "0.1.0" }), { status: 200 }),
    );

    const { checkForUpdate } = await import("./update-check.js");
    await checkForUpdate();

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("no output on network error (silent)", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"));

    const { checkForUpdate } = await import("./update-check.js");
    await checkForUpdate();

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("skips check if checked within 24 hours", async () => {
    // Write a recent last-check file
    fs.mkdirSync(mockConfigDir, { recursive: true });
    fs.writeFileSync(
      path.join(mockConfigDir, "last-update-check"),
      String(Date.now()),
    );

    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ version: "2.0.0" }), { status: 200 }),
    );

    const { checkForUpdate } = await import("./update-check.js");
    await checkForUpdate();

    // fetch should not be called since we checked recently
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("no check when not TTY", async () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: undefined,
      configurable: true,
    });

    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ version: "2.0.0" }), { status: 200 }),
    );

    const { checkForUpdate } = await import("./update-check.js");
    await checkForUpdate();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(stderrSpy).not.toHaveBeenCalled();
  });
});
