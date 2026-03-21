import { EXIT_CODES } from "./constants.js";
import type { ExitCode } from "./types.js";

export class HopkinError extends Error {
  readonly exitCode: ExitCode;
  readonly hint?: string;

  constructor(message: string, exitCode: ExitCode, hint?: string) {
    super(message);
    this.name = "HopkinError";
    this.exitCode = exitCode;
    this.hint = hint;
  }
}

export class AuthError extends HopkinError {
  constructor(message?: string, hint?: string) {
    super(
      message ?? "Not authenticated.",
      EXIT_CODES.AUTH_ERROR,
      hint ?? "Run `hopkin auth set-key <your-key>` or set HOPKIN_API_KEY environment variable.",
    );
    this.name = "AuthError";
  }
}

export class APIError extends HopkinError {
  readonly statusCode: number;

  constructor(message: string, statusCode: number, hint?: string) {
    const exitCode =
      statusCode === 404
        ? EXIT_CODES.NOT_FOUND
        : statusCode === 429
          ? EXIT_CODES.RATE_LIMIT
          : EXIT_CODES.SERVER_ERROR;
    super(message, exitCode, hint ?? APIError.defaultHint(statusCode));
    this.name = "APIError";
    this.statusCode = statusCode;
  }

  private static defaultHint(statusCode: number): string {
    if (statusCode === 401 || statusCode === 403) {
      return "Authentication failed. Your API key may be invalid or expired. Run `hopkin auth set-key` to update.";
    }
    if (statusCode === 429) {
      return "Rate limited. Wait a moment and try again, or use --limit to reduce page size.";
    }
    if (statusCode === 404) {
      return "Resource not found. Check your account ID and resource identifiers.";
    }
    if (statusCode >= 500) {
      return "Server error. Try again later. Use --debug for details.";
    }
    return "";
  }
}

export class ConfigError extends HopkinError {
  constructor(message: string, hint?: string) {
    super(message, EXIT_CODES.GENERAL_ERROR, hint);
    this.name = "ConfigError";
  }
}

export class CommandNotFoundError extends HopkinError {
  constructor(command: string, hint?: string) {
    super(
      `Unknown command: ${command}`,
      EXIT_CODES.NOT_FOUND,
      hint ??
        "Run `hopkin tools refresh` to update available commands, or `hopkin --help` to see all commands.",
    );
    this.name = "CommandNotFoundError";
  }
}
