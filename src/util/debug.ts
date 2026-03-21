let debugEnabled = false;

export function setDebug(enabled: boolean): void {
  debugEnabled = enabled;
}

export function isDebugEnabled(): boolean {
  return debugEnabled || !!process.env.HOPKIN_DEBUG;
}

export function debugLog(label: string, data: unknown): void {
  if (!isDebugEnabled()) return;
  process.stderr.write(`[DEBUG] ${label}: ${JSON.stringify(data)}\n`);
}

export function debugRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown,
): void {
  if (!isDebugEnabled()) return;
  const redacted = redactHeaders(headers);
  process.stderr.write(
    `[DEBUG] ${method} ${url} headers=${JSON.stringify(redacted)}${body !== undefined ? ` body=${JSON.stringify(body)}` : ""}\n`,
  );
}

export function debugResponse(
  statusCode: number,
  headers: Record<string, string>,
  body?: unknown,
): void {
  if (!isDebugEnabled()) return;
  const bodyStr = body !== undefined ? JSON.stringify(body) : "";
  const truncated = bodyStr.length > 500 ? bodyStr.slice(0, 500) + "..." : bodyStr;
  process.stderr.write(
    `[DEBUG] Response status=${statusCode} headers=${JSON.stringify(headers)}${truncated ? ` body=${truncated}` : ""}\n`,
  );
}

function redactHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === "authorization") {
      const match = value.match(/^(Bearer\s+)(\S+)/);
      if (match) {
        const token = match[2];
        const prefix = token.slice(0, 4);
        result[key] = `Bearer ${prefix}****...`;
      } else {
        result[key] = "****";
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}
