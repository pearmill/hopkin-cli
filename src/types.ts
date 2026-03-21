import type { EXIT_CODES } from "./constants.js";

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

export interface ServerConfig {
  url: string;
}

export interface PlatformConfig {
  default_account?: string;
  mcc_id?: string;
  [key: string]: string | undefined;
}

export interface HopkinConfig {
  default_platform?: string;
  output_format?: OutputFormat;
  servers?: Record<string, ServerConfig>;
  [key: string]: unknown;
}

export type OutputFormat = "table" | "json" | "csv" | "tsv";

export interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  platform: string;
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  items?: JSONSchemaProperty;
}

export interface MCPToolsListResponse {
  tools: MCPTool[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

export interface MCPToolCallRequest {
  method: "tools/call";
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface MCPToolCallResponse {
  content: MCPContent[];
  isError?: boolean;
  structuredContent?: {
    data?: Record<string, unknown>[];
    count?: number;
    cached?: boolean;
    synced_at?: string;
    nextCursor?: string;
    [key: string]: unknown;
  };
  _meta?: {
    cursor?: string;
    has_more?: boolean;
    total?: number;
  };
}

export interface MCPContent {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface ParsedCommand {
  platform: string;
  noun: string;
  verb: string;
}

export interface FlagDefinition {
  name: string;
  type: "string" | "boolean" | "number";
  description?: string;
  required?: boolean;
  default?: unknown;
  choices?: string[];
  alias?: string;
}

export interface AuthCredentials {
  api_key?: string;
  oauth?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

export interface ToolsCacheEntry {
  platform: string;
  tools: MCPTool[];
  fetched_at: number;
  server_url: string;
}

export interface ToolsCache {
  version: number;
  entries: Record<string, ToolsCacheEntry>;
}

export interface PaginationOptions {
  all: boolean;
  limit: number;
  cursor?: string;
}

export interface PageResult<T = Record<string, unknown>> {
  data: T[];
  cursor?: string;
  has_more: boolean;
  total?: number;
}
