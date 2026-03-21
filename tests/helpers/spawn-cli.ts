import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, "../../dist/hopkin.cjs");

export interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function spawnCLI(
  args: string[],
  options: { env?: Record<string, string>; timeout?: number; cwd?: string } = {},
): Promise<CLIResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI_PATH, ...args], {
      timeout: options.timeout ?? 10000,
      env: { ...process.env, ...options.env, NO_COLOR: "1", NODE_ENV: "", TEST: "" },
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    child.on("close", (code) => {
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString(),
        stderr: Buffer.concat(stderrChunks).toString(),
        exitCode: code ?? 0,
      });
    });
  });
}
