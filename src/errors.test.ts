import { describe, it, expect } from "vitest";
import {
  HopkinError,
  AuthError,
  APIError,
  ConfigError,
  CommandNotFoundError,
} from "./errors.js";
import { EXIT_CODES } from "./constants.js";

describe("errors", () => {
  describe("HopkinError", () => {
    it("has correct exitCode", () => {
      const err = new HopkinError("test", EXIT_CODES.GENERAL_ERROR);
      expect(err.exitCode).toBe(EXIT_CODES.GENERAL_ERROR);
    });

    it("has name property set", () => {
      const err = new HopkinError("test", EXIT_CODES.GENERAL_ERROR);
      expect(err.name).toBe("HopkinError");
    });

    it("hint property is accessible", () => {
      const err = new HopkinError("test", EXIT_CODES.GENERAL_ERROR, "try this");
      expect(err.hint).toBe("try this");
    });

    it("hint is undefined when not provided", () => {
      const err = new HopkinError("test", EXIT_CODES.GENERAL_ERROR);
      expect(err.hint).toBeUndefined();
    });
  });

  describe("AuthError", () => {
    it("has exit code 2 (AUTH_ERROR)", () => {
      const err = new AuthError("not authenticated");
      expect(err.exitCode).toBe(2);
      expect(err.exitCode).toBe(EXIT_CODES.AUTH_ERROR);
    });

    it("has name set to AuthError", () => {
      const err = new AuthError("test");
      expect(err.name).toBe("AuthError");
    });
  });

  describe("APIError", () => {
    it("404 maps to exit code 4 (NOT_FOUND)", () => {
      const err = new APIError("not found", 404);
      expect(err.exitCode).toBe(4);
      expect(err.exitCode).toBe(EXIT_CODES.NOT_FOUND);
    });

    it("429 maps to exit code 5 (RATE_LIMIT)", () => {
      const err = new APIError("rate limited", 429);
      expect(err.exitCode).toBe(5);
      expect(err.exitCode).toBe(EXIT_CODES.RATE_LIMIT);
    });

    it("500 maps to exit code 3 (SERVER_ERROR)", () => {
      const err = new APIError("server error", 500);
      expect(err.exitCode).toBe(3);
      expect(err.exitCode).toBe(EXIT_CODES.SERVER_ERROR);
    });

    it("has name set to APIError", () => {
      const err = new APIError("test", 500);
      expect(err.name).toBe("APIError");
    });

    it("has statusCode property", () => {
      const err = new APIError("test", 404);
      expect(err.statusCode).toBe(404);
    });

    it("hint property is accessible", () => {
      const err = new APIError("test", 500, "retry later");
      expect(err.hint).toBe("retry later");
    });
  });

  describe("ConfigError", () => {
    it("has exit code 1 (GENERAL_ERROR)", () => {
      const err = new ConfigError("bad config");
      expect(err.exitCode).toBe(1);
      expect(err.exitCode).toBe(EXIT_CODES.GENERAL_ERROR);
    });

    it("has name set to ConfigError", () => {
      const err = new ConfigError("test");
      expect(err.name).toBe("ConfigError");
    });
  });

  describe("CommandNotFoundError", () => {
    it("has exit code 4 (NOT_FOUND)", () => {
      const err = new CommandNotFoundError("foo");
      expect(err.exitCode).toBe(4);
      expect(err.exitCode).toBe(EXIT_CODES.NOT_FOUND);
    });

    it("has default hint", () => {
      const err = new CommandNotFoundError("foo");
      expect(err.hint).toBe(
        "Run `hopkin tools refresh` to update available commands, or `hopkin --help` to see all commands."
      );
    });

    it("allows custom hint", () => {
      const err = new CommandNotFoundError("foo", "try bar instead");
      expect(err.hint).toBe("try bar instead");
    });

    it("has name set to CommandNotFoundError", () => {
      const err = new CommandNotFoundError("foo");
      expect(err.name).toBe("CommandNotFoundError");
    });

    it("includes command in message", () => {
      const err = new CommandNotFoundError("foo");
      expect(err.message).toBe("Unknown command: foo");
    });
  });
});
