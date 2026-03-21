import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { debugLog, debugRequest, debugResponse, setDebug } from "./debug.js";

describe("util/debug", () => {
  const originalEnv = { ...process.env };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stderrSpy: any;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    delete process.env.HOPKIN_DEBUG;
    setDebug(false);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    process.env = { ...originalEnv };
  });

  describe("debugLog", () => {
    it("outputs to stderr with [DEBUG] prefix when debug is on", () => {
      setDebug(true);
      debugLog("test-label", { key: "value" });
      expect(stderrSpy).toHaveBeenCalledWith(
        '[DEBUG] test-label: {"key":"value"}\n',
      );
    });

    it("outputs nothing when debug is off", () => {
      debugLog("test-label", { key: "value" });
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it("outputs when HOPKIN_DEBUG env is set", () => {
      process.env.HOPKIN_DEBUG = "1";
      debugLog("env-test", "data");
      expect(stderrSpy).toHaveBeenCalledWith(
        '[DEBUG] env-test: "data"\n',
      );
    });
  });

  describe("debugRequest", () => {
    it("shows method, URL, and redacted headers", () => {
      setDebug(true);
      debugRequest("POST", "https://example.com/api", {
        "Content-Type": "application/json",
        Authorization: "Bearer hpk_abc123secret",
      });

      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("[DEBUG] POST https://example.com/api");
      expect(output).toContain("hpk_****...");
      expect(output).not.toContain("abc123secret");
    });

    it("shows body when provided", () => {
      setDebug(true);
      debugRequest(
        "POST",
        "https://example.com",
        {},
        { method: "tools/call" },
      );
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain('body={"method":"tools/call"}');
    });

    it("outputs nothing when debug is off", () => {
      debugRequest("POST", "https://example.com", {});
      expect(stderrSpy).not.toHaveBeenCalled();
    });
  });

  describe("debugResponse", () => {
    it("shows status and body", () => {
      setDebug(true);
      debugResponse(200, { "content-type": "application/json" }, {
        data: "ok",
      });
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("[DEBUG] Response status=200");
      expect(output).toContain('{"data":"ok"}');
    });

    it("truncates body to 500 chars", () => {
      setDebug(true);
      const longBody = { data: "x".repeat(600) };
      debugResponse(200, {}, longBody);
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("...");
      // The truncated portion (after [DEBUG] prefix etc.) should have body cut off
      const bodyPart = output.split("body=")[1];
      // 500 chars + "..." = 503 + "\n"
      expect(bodyPart!.length).toBeLessThanOrEqual(504);
    });

    it("outputs nothing when debug is off", () => {
      debugResponse(200, {}, { data: "ok" });
      expect(stderrSpy).not.toHaveBeenCalled();
    });
  });
});
