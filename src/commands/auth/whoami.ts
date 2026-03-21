import { defineCommand } from "citty";
import { resolveAuth } from "../../auth/resolver.js";
import { getConfigDir } from "../../config/paths.js";
import { renderJSON } from "../../output/json.js";
import { AuthError } from "../../errors.js";

export default defineCommand({
  meta: { name: "whoami", description: "Show current authenticated user" },
  args: {
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  run({ args }) {
    const configDir = process.env.HOPKIN_CONFIG_DIR ?? getConfigDir();

    try {
      const token = resolveAuth({ configDir });
      const source = process.env.HOPKIN_API_KEY
        ? "environment"
        : "credentials_file";

      if (args.json) {
        const result = {
          authenticated: true,
          auth_source: source,
          key_prefix: token.slice(0, 4) + "****",
        };
        process.stdout.write(renderJSON(result, { pretty: true }) + "\n");
      } else {
        process.stderr.write("Authenticated\n");
        process.stderr.write(`Source: ${source}\n`);
        process.stderr.write(`Key: ${token.slice(0, 4)}****\n`);
      }
    } catch (err) {
      if (err instanceof AuthError) {
        if (args.json) {
          const result = { authenticated: false, error: err.message };
          process.stdout.write(renderJSON(result, { pretty: true }) + "\n");
        } else {
          process.stderr.write(`${err.message}\n`);
          if (err.hint) {
            process.stderr.write(`${err.hint}\n`);
          }
        }
        process.exitCode = err.exitCode;
      } else {
        throw err;
      }
    }
  },
});
