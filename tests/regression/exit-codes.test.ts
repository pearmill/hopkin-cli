import { describe, it, expect } from "vitest";
import { EXIT_CODES } from "../../src/constants.js";
import {
  HopkinError,
  AuthError,
  APIError,
  ConfigError,
  CommandNotFoundError,
} from "../../src/errors.js";

describe("Exit codes", () => {
  describe("SUCCESS (0)", () => {
    it("EXIT_CODES.SUCCESS equals 0", () => {
      expect(EXIT_CODES.SUCCESS).toBe(0);
    });
  });

  describe("GENERAL_ERROR (1) - ConfigError", () => {
    it("ConfigError has exitCode 1", () => {
      const err = new ConfigError("Invalid config");
      expect(err.exitCode).toBe(1);
      expect(err.exitCode).toBe(EXIT_CODES.GENERAL_ERROR);
    });

    it("ConfigError sets name to ConfigError", () => {
      const err = new ConfigError("bad config");
      expect(err.name).toBe("ConfigError");
    });

    it("ConfigError is an instance of HopkinError", () => {
      const err = new ConfigError("bad config");
      expect(err).toBeInstanceOf(HopkinError);
    });

    it("ConfigError preserves hint", () => {
      const err = new ConfigError("bad config", "Check your config file");
      expect(err.hint).toBe("Check your config file");
    });
  });

  describe("AUTH_ERROR (2) - AuthError", () => {
    it("AuthError has exitCode 2", () => {
      const err = new AuthError("No credentials");
      expect(err.exitCode).toBe(2);
      expect(err.exitCode).toBe(EXIT_CODES.AUTH_ERROR);
    });

    it("AuthError sets name to AuthError", () => {
      const err = new AuthError("No credentials");
      expect(err.name).toBe("AuthError");
    });

    it("AuthError is an instance of HopkinError", () => {
      const err = new AuthError("No credentials");
      expect(err).toBeInstanceOf(HopkinError);
    });

    it("AuthError preserves hint", () => {
      const err = new AuthError("expired", "Run hopkin auth login");
      expect(err.hint).toBe("Run hopkin auth login");
    });
  });

  describe("SERVER_ERROR (3) - APIError(500)", () => {
    it("APIError with status 500 has exitCode 3", () => {
      const err = new APIError("Internal server error", 500);
      expect(err.exitCode).toBe(3);
      expect(err.exitCode).toBe(EXIT_CODES.SERVER_ERROR);
    });

    it("APIError with status 502 has exitCode 3", () => {
      const err = new APIError("Bad gateway", 502);
      expect(err.exitCode).toBe(3);
    });

    it("APIError with status 503 has exitCode 3", () => {
      const err = new APIError("Service unavailable", 503);
      expect(err.exitCode).toBe(3);
    });

    it("APIError preserves statusCode", () => {
      const err = new APIError("error", 500);
      expect(err.statusCode).toBe(500);
    });

    it("APIError sets name to APIError", () => {
      const err = new APIError("error", 500);
      expect(err.name).toBe("APIError");
    });
  });

  describe("NOT_FOUND (4) - APIError(404), CommandNotFoundError", () => {
    it("APIError with status 404 has exitCode 4", () => {
      const err = new APIError("Not found", 404);
      expect(err.exitCode).toBe(4);
      expect(err.exitCode).toBe(EXIT_CODES.NOT_FOUND);
    });

    it("CommandNotFoundError has exitCode 4", () => {
      const err = new CommandNotFoundError("meta campaigns foo");
      expect(err.exitCode).toBe(4);
      expect(err.exitCode).toBe(EXIT_CODES.NOT_FOUND);
    });

    it("CommandNotFoundError sets name to CommandNotFoundError", () => {
      const err = new CommandNotFoundError("unknown");
      expect(err.name).toBe("CommandNotFoundError");
    });

    it("CommandNotFoundError message includes the command", () => {
      const err = new CommandNotFoundError("meta campaigns foo");
      expect(err.message).toContain("meta campaigns foo");
    });

    it("CommandNotFoundError provides default hint", () => {
      const err = new CommandNotFoundError("test");
      expect(err.hint).toContain("hopkin tools refresh");
    });

    it("CommandNotFoundError allows custom hint", () => {
      const err = new CommandNotFoundError("test", "Try something else");
      expect(err.hint).toBe("Try something else");
    });
  });

  describe("RATE_LIMIT (5) - APIError(429)", () => {
    it("APIError with status 429 has exitCode 5", () => {
      const err = new APIError("Rate limited", 429);
      expect(err.exitCode).toBe(5);
      expect(err.exitCode).toBe(EXIT_CODES.RATE_LIMIT);
    });

    it("APIError(429) preserves statusCode", () => {
      const err = new APIError("Rate limited", 429);
      expect(err.statusCode).toBe(429);
    });
  });

  describe("All exit codes are distinct", () => {
    it("no two exit codes share the same value", () => {
      const values = Object.values(EXIT_CODES);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });

    it("exit codes span 0 through 5", () => {
      const values = Object.values(EXIT_CODES).sort((a, b) => a - b);
      expect(values).toEqual([0, 1, 2, 3, 4, 5]);
    });
  });
});
