import { defineCommand } from "citty";
import { readCredentials, hasCredentials } from "../../auth/credentials.js";
import { getConfigDir } from "../../config/paths.js";
import { renderJSON } from "../../output/json.js";
import { EXIT_CODES } from "../../constants.js";

function maskKey(key: string): string {
  if (key.length <= 8) {
    return key.slice(0, 4) + "****";
  }
  return key.slice(0, 4) + "****" + key.slice(-4);
}

export default defineCommand({
  meta: { name: "status", description: "Show authentication status" },
  args: {
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  run({ args }) {
    const configDir = process.env.HOPKIN_CONFIG_DIR ?? getConfigDir();
    const creds = readCredentials(configDir);
    const authenticated = !!(creds.api_key || creds.oauth);

    let authType: string = "none";
    let maskedKey: string | undefined;

    if (creds.api_key) {
      authType = "api_key";
      maskedKey = maskKey(creds.api_key);
    } else if (creds.oauth) {
      authType = "oauth";
    }

    if (args.json) {
      const result = {
        authenticated,
        auth_type: authType,
        ...(maskedKey ? { api_key: maskedKey } : {}),
      };
      process.stdout.write(renderJSON(result, { pretty: true }) + "\n");
    } else {
      if (authenticated) {
        process.stderr.write(`Authenticated via ${authType}\n`);
        if (maskedKey) {
          process.stderr.write(`API key: ${maskedKey}\n`);
        }
      } else {
        process.stderr.write("Not authenticated\n");
        process.stderr.write(
          'Run "hopkin auth set-key <key>" or set HOPKIN_API_KEY env var.\n',
        );
      }
    }

    if (!authenticated) {
      process.exitCode = EXIT_CODES.AUTH_ERROR;
    }
  },
});
