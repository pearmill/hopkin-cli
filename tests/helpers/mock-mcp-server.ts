import http from "node:http";
import type { MCPToolsListResponse, MCPToolCallResponse } from "../../src/types.js";

interface MockServerOptions {
  tools?: MCPToolsListResponse;
  callResponse?: MCPToolCallResponse;
  errorCode?: number;
  delay?: number;
}

export function createMockMCPServer(options: MockServerOptions = {}) {
  const server = http.createServer((req, res) => {
    const respond = () => {
      if (options.errorCode) {
        res.writeHead(options.errorCode, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Mock error ${options.errorCode}` }));
        return;
      }

      const body: Buffer[] = [];
      req.on("data", (chunk: Buffer) => body.push(chunk));
      req.on("end", () => {
        const parsed = JSON.parse(Buffer.concat(body).toString());
        res.writeHead(200, { "Content-Type": "application/json" });

        if (parsed.method === "tools/list") {
          res.end(JSON.stringify(options.tools ?? { tools: [] }));
        } else if (parsed.method === "tools/call") {
          res.end(
            JSON.stringify(
              options.callResponse ?? {
                content: [{ type: "text", text: "{}" }],
              },
            ),
          );
        } else {
          res.end(JSON.stringify({ error: "Unknown method" }));
        }
      });
    };

    if (options.delay) {
      setTimeout(respond, options.delay);
    } else {
      respond();
    }
  });

  return {
    server,
    async start(): Promise<number> {
      return new Promise((resolve) => {
        server.listen(0, () => {
          const addr = server.address();
          if (addr && typeof addr === "object") {
            resolve(addr.port);
          }
        });
      });
    },
    async stop(): Promise<void> {
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}
