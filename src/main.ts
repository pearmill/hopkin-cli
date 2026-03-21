import { VERSION, EXIT_CODES } from "./constants.js";
import { HopkinError } from "./errors.js";
import { setDebug } from "./util/debug.js";
import { isColorEnabled } from "./util/tty.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--version") || args.includes("-v")) {
    process.stdout.write(VERSION + "\n");
    return;
  }

  if (args.includes("--no-color")) {
    process.env.NO_COLOR = "1";
  }

  if (args.includes("--debug")) {
    process.env.HOPKIN_DEBUG = "1";
    setDebug(true);
  }

  const { runCli } = await import("./cli.js");
  await runCli();

  // Non-blocking background update check (fire and forget)
  import("./util/update-check.js").then((m) => m.checkForUpdate()).catch(() => {});
}

function formatError(err: unknown): void {
  const useColor = isColorEnabled();
  const red = useColor ? "\x1b[31m" : "";
  const dim = useColor ? "\x1b[2m" : "";
  const reset = useColor ? "\x1b[0m" : "";

  if (err instanceof HopkinError) {
    process.stderr.write(`${red}Error: ${err.message}${reset}\n`);
    if (err.hint) {
      process.stderr.write(`${dim}${err.hint}${reset}\n`);
    }
    process.exit(err.exitCode);
  }

  process.stderr.write(
    `${red}Error: ${err instanceof Error ? err.message : String(err)}${reset}\n`,
  );
  process.exit(EXIT_CODES.GENERAL_ERROR);
}

main().catch(formatError);
