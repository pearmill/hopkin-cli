import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import nock from "nock";
import { MCPClient } from "./mcp-client.js";
import { AuthError, APIError } from "../errors.js";
import { setDebug } from "../util/debug.js";

const BASE_ORIGIN = "https://meta.mcp.hopkin.ai";
const SERVER_PATH = "/";
const BASE_URL = BASE_ORIGIN;
const API_KEY = "test-api-key-123";
const NO_DELAY = [0, 0, 0];

function createClient(opts: { debug?: boolean; timeout?: number } = {}) {
  return new MCPClient({
    baseUrl: BASE_URL,
    apiKey: API_KEY,
    _retryDelays: NO_DELAY,
    ...opts,
  });
}

describe("MCPClient", () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    setDebug(false);
  });

  describe("toolsList", () => {
    it("returns parsed response on success", async () => {
      const tools = [
        { name: "meta_ads_get_campaigns", description: "Get campaigns", inputSchema: { type: "object" } },
      ];
      nock(BASE_ORIGIN)
        .post(SERVER_PATH, (body: Record<string, unknown>) => body.method === "tools/list")
        .reply(200, { result: { tools } });

      const client = createClient();
      const result = await client.toolsList();
      expect(result).toEqual({ tools });
    });
  });

  describe("toolsCall", () => {
    it("returns parsed response on success", async () => {
      const response = {
        content: [{ type: "text", text: '{"data": []}' }],
        isError: false,
      };
      nock(BASE_ORIGIN)
        .post(SERVER_PATH, (body: Record<string, unknown>) =>
          body.method === "tools/call" &&
          (body.params as Record<string, unknown>).name === "meta_ads_get_campaigns")
        .reply(200, { result: response });

      const client = createClient();
      const result = await client.toolsCall("meta_ads_get_campaigns", { account_id: "123" });
      expect(result).toEqual(response);
    });
  });

  describe("authentication errors", () => {
    it("throws AuthError on 401", async () => {
      nock(BASE_ORIGIN)
        .post(SERVER_PATH)
        .reply(401, { error: "Unauthorized" });

      const client = createClient();
      await expect(client.toolsList()).rejects.toThrow(AuthError);
    });

    it("throws AuthError on 403", async () => {
      nock(BASE_ORIGIN)
        .post(SERVER_PATH)
        .reply(403, { error: "Forbidden" });

      const client = createClient();
      await expect(client.toolsList()).rejects.toThrow(AuthError);
    });
  });

  describe("API errors", () => {
    it("throws APIError with NOT_FOUND exit code on 404", async () => {
      nock(BASE_ORIGIN)
        .post(SERVER_PATH)
        .reply(404, { error: "Not found" });

      const client = createClient();
      try {
        await client.toolsList();
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(APIError);
        expect((e as APIError).exitCode).toBe(4); // NOT_FOUND
      }
    });
  });

  describe("retry on 429", () => {
    it("retries and eventually throws APIError with RATE_LIMIT", async () => {
      nock(BASE_ORIGIN).post(SERVER_PATH).reply(429, { error: "Rate limited" });
      nock(BASE_ORIGIN).post(SERVER_PATH).reply(429, { error: "Rate limited" });
      nock(BASE_ORIGIN).post(SERVER_PATH).reply(429, { error: "Rate limited" });
      nock(BASE_ORIGIN).post(SERVER_PATH).reply(429, { error: "Rate limited" });

      const client = createClient();
      try {
        await client.toolsList();
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(APIError);
        expect((e as APIError).exitCode).toBe(5); // RATE_LIMIT
      }
    });

    it("succeeds after retrying a 429", async () => {
      const tools = [{ name: "test_tool", description: "desc", inputSchema: { type: "object" } }];
      nock(BASE_ORIGIN).post(SERVER_PATH).reply(429, { error: "Rate limited" });
      nock(BASE_ORIGIN).post(SERVER_PATH).reply(200, { result: { tools } });

      const client = createClient();
      const result = await client.toolsList();
      expect(result).toEqual({ tools });
    });
  });

  describe("retry on 5xx", () => {
    it("retries and eventually throws APIError with SERVER_ERROR", async () => {
      nock(BASE_ORIGIN).post(SERVER_PATH).reply(500, { error: "Internal error" });
      nock(BASE_ORIGIN).post(SERVER_PATH).reply(500, { error: "Internal error" });
      nock(BASE_ORIGIN).post(SERVER_PATH).reply(500, { error: "Internal error" });
      nock(BASE_ORIGIN).post(SERVER_PATH).reply(500, { error: "Internal error" });

      const client = createClient();
      try {
        await client.toolsList();
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(APIError);
        expect((e as APIError).exitCode).toBe(3); // SERVER_ERROR
      }
    });

    it("succeeds after retrying a 500", async () => {
      const tools = [{ name: "test_tool", description: "desc", inputSchema: { type: "object" } }];
      nock(BASE_ORIGIN).post(SERVER_PATH).reply(500, { error: "Server error" });
      nock(BASE_ORIGIN).post(SERVER_PATH).reply(200, { result: { tools } });

      const client = createClient();
      const result = await client.toolsList();
      expect(result).toEqual({ tools });
    });
  });

  describe("headers", () => {
    it("sends correct Authorization header", async () => {
      nock(BASE_ORIGIN)
        .post(SERVER_PATH)
        .matchHeader("Authorization", `Bearer ${API_KEY}`)
        .reply(200, { result: { tools: [] } });

      const client = createClient();
      const result = await client.toolsList();
      expect(result).toEqual({ tools: [] });
    });

    it("sends correct Content-Type header", async () => {
      nock(BASE_ORIGIN)
        .post(SERVER_PATH)
        .matchHeader("Content-Type", "application/json")
        .reply(200, { result: { tools: [] } });

      const client = createClient();
      const result = await client.toolsList();
      expect(result).toEqual({ tools: [] });
    });
  });

  describe("debug mode", () => {
    it("logs to stderr with redacted auth header", async () => {
      const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

      nock(BASE_ORIGIN)
        .post(SERVER_PATH)
        .reply(200, { result: { tools: [] } });

      const client = createClient({ debug: true });
      await client.toolsList();

      const output = stderrSpy.mock.calls.map((c) => String(c[0])).join("");
      expect(output).toContain("POST");
      expect(output).toContain(BASE_URL);
      expect(output).not.toContain(API_KEY);
      expect(output).toContain("****...");

      stderrSpy.mockRestore();
    });
  });
});
