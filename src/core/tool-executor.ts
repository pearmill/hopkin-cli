import type { MCPToolCallResponse, PageResult } from "../types.js";
import { MCPClient } from "./mcp-client.js";
import { paginate } from "../pagination/paginator.js";

export interface ExecuteOptions {
  platform: string;
  toolName: string;
  args: Record<string, unknown>;
  apiKey: string;
  serverUrl: string;
  debug?: boolean;
  all?: boolean;
  limit?: number;
}

export async function executeTool(
  options: ExecuteOptions,
): Promise<MCPToolCallResponse> {
  const client = new MCPClient({
    baseUrl: options.serverUrl,
    apiKey: options.apiKey,
    debug: options.debug,
  });

  return client.toolsCall(options.toolName, options.args);
}

export async function* executeToolPaginated(
  options: ExecuteOptions,
): AsyncGenerator<PageResult> {
  const client = new MCPClient({
    baseUrl: options.serverUrl,
    apiKey: options.apiKey,
    debug: options.debug,
  });

  const fetchPage = async (cursor?: string): Promise<MCPToolCallResponse> => {
    const args = { ...options.args };
    if (cursor) {
      args.cursor = cursor;
    }
    if (options.limit) {
      args.limit = options.limit;
    }
    return client.toolsCall(options.toolName, args);
  };

  yield* paginate({
    fetchPage,
    all: options.all,
    limit: options.limit,
  });
}
