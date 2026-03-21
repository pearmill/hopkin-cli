import { AuthError, APIError } from "../errors.js";
import { debugRequest, debugResponse, setDebug } from "../util/debug.js";
import type { MCPToolsListResponse, MCPToolCallResponse } from "../types.js";

export interface MCPClientOptions {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  debug?: boolean;
  /** @internal Override retry delays for testing. */
  _retryDelays?: number[];
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF_MS = [1000, 2000, 4000];

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

export class MCPClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly debug: boolean;
  private readonly retryDelays: number[];

  constructor(options: MCPClientOptions) {
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
    this.timeout = options.timeout ?? 30_000;
    this.debug = options.debug ?? false;
    this.retryDelays = options._retryDelays ?? DEFAULT_BACKOFF_MS;
    if (this.debug) {
      setDebug(true);
    }
  }

  private nextId = 1;

  async toolsList(): Promise<MCPToolsListResponse> {
    const response = await this.request<{ tools: MCPToolsListResponse["tools"] }>({
      jsonrpc: "2.0",
      id: this.nextId++,
      method: "tools/list",
      params: {},
    });
    return { tools: response.tools };
  }

  async toolsCall(name: string, args: Record<string, unknown>): Promise<MCPToolCallResponse> {
    return this.request({
      jsonrpc: "2.0",
      id: this.nextId++,
      method: "tools/call",
      params: { name, arguments: args },
    });
  }

  private async request<T>(body: Record<string, unknown>): Promise<T> {
    const maxAttempts = this.retryDelays.length > 0 ? this.retryDelays.length + 1 : DEFAULT_MAX_RETRIES;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0 && this.retryDelays[attempt - 1] !== undefined) {
        await this.sleep(this.retryDelays[attempt - 1]);
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${this.apiKey}`,
      };

      debugRequest("POST", this.baseUrl, headers, body);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      let response: Response;
      try {
        response = await fetch(this.baseUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeoutId);
        const innerMsg = err instanceof Error ? err.message : String(err);
        lastError = new Error(`Failed to connect to ${this.baseUrl}: ${innerMsg}`);
        continue;
      } finally {
        clearTimeout(timeoutId);
      }

      debugResponse(response.status, Object.fromEntries(response.headers.entries()));

      if (response.status === 401 || response.status === 403) {
        throw new AuthError(`Authentication failed (${response.status})`);
      }

      if (isRetryable(response.status)) {
        lastError = new APIError(
          `Request failed with status ${response.status}`,
          response.status,
        );
        continue;
      }

      if (!response.ok) {
        throw new APIError(
          `Request failed with status ${response.status}`,
          response.status,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;
      // Handle JSON-RPC response wrapper
      if ("result" in data) {
        return data.result as T;
      }
      if ("error" in data && data.error && typeof data.error === "object") {
        const rpcError = data.error as { code?: number; message?: string };
        throw new APIError(
          rpcError.message ?? "JSON-RPC error",
          rpcError.code === -32000 ? 400 : 500,
        );
      }
      return data as T;
    }

    if (lastError instanceof APIError) {
      throw lastError;
    }
    throw new APIError(
      lastError?.message ?? "Request failed after retries",
      500,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
