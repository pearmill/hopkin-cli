import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnCLI } from "../helpers/spawn-cli.js";
import type { ToolsCache, MCPTool } from "../../src/types.js";

function makeTool(name: string): MCPTool {
  return { name, description: `Desc for ${name}`, inputSchema: { type: "object", properties: {} } };
}

let tmpDir: string;

function seedDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hopkin-err-msg-"));
  fs.writeFileSync(path.join(dir, "credentials.json"), JSON.stringify({ api_key: "test-key" }));
  fs.writeFileSync(path.join(dir, "config.json"), JSON.stringify({}));
  const cache: ToolsCache = {
    version: 1,
    entries: {
      meta: {
        platform: "meta",
        tools: [
          makeTool("meta_ads_ping"),
          makeTool("meta_ads_list_ad_accounts"),
          makeTool("meta_ads_list_campaigns"),
          makeTool("meta_ads_get_campaigns"),
          makeTool("meta_ads_list_adsets"),
          makeTool("meta_ads_list_ads"),
        ],
        fetched_at: Date.now(),
        server_url: "http://localhost:9999",
      },
    },
  };
  fs.writeFileSync(path.join(dir, "tools-cache.json"), JSON.stringify(cache));
  return dir;
}

describe("Error message quality", () => {
  beforeEach(() => { tmpDir = seedDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it("unknown platform command does not tell user to run 'tools refresh'", async () => {
    const result = await spawnCLI(["meta", "nonexistent", "--reason", "test"], {
      env: { HOPKIN_CONFIG_DIR: tmpDir },
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).not.toContain("Run `hopkin tools refresh`");
  });

  it("unknown command shows 'Did you mean?' with suggestions", async () => {
    const result = await spawnCLI(["meta", "campaign", "--reason", "test"], {
      env: { HOPKIN_CONFIG_DIR: tmpDir },
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("Did you mean?");
    expect(result.stderr).toContain("campaigns");
  });

  it("unknown command with no matches shows tools list hint", async () => {
    const result = await spawnCLI(["meta", "zzzzz", "--reason", "test"], {
      env: { HOPKIN_CONFIG_DIR: tmpDir },
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("hopkin tools list");
  });

  it("platform-only command shows platform help", async () => {
    const result = await spawnCLI(["meta"], {
      env: { HOPKIN_CONFIG_DIR: tmpDir },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("hopkin meta");
  });

  it("exit code is NOT_FOUND (4) for unknown commands", async () => {
    const result = await spawnCLI(["meta", "nonexistent", "--reason", "test"], {
      env: { HOPKIN_CONFIG_DIR: tmpDir },
    });
    expect(result.exitCode).toBe(4);
  });
});
