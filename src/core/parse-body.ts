import { APIError } from "../errors.js";

export const MAX_ERROR_BODY_CHARS = 2000;

/**
 * Parse a response body that was read as text. If it is not JSON, throw an
 * APIError carrying the HTTP status, the request path and the first 2,000
 * chars of the body, instead of a bare JSON.parse SyntaxError that clips it.
 * Never include headers or credentials here.
 */
export function parseJsonBody<T = unknown>(
  text: string,
  status: number,
  path: string,
): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const body = text.length > MAX_ERROR_BODY_CHARS ? text.slice(0, MAX_ERROR_BODY_CHARS) : text;
    throw new APIError(
      `Hopkin API returned non-JSON (HTTP ${status}) for ${path}: ${body}`,
      status >= 400 ? status : 502,
      "",
    );
  }
}
