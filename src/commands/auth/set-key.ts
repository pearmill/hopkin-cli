import { defineCommand } from "citty";
import { readCredentials, writeCredentials } from "../../auth/credentials.js";
import { getConfigDir } from "../../config/paths.js";

const API_KEY_PREFIX = "hpk_";

export default defineCommand({
  meta: { name: "set-key", description: "Set an API key for authentication" },
  args: {
    key: {
      type: "positional",
      description: "API key (must start with hpk_)",
      required: false,
    },
    clear: {
      type: "boolean",
      description: "Remove the stored API key",
      default: false,
    },
  },
  run({ args }) {
    const configDir = process.env.HOPKIN_CONFIG_DIR ?? getConfigDir();

    if (args.clear) {
      const creds = readCredentials(configDir);
      delete creds.api_key;
      writeCredentials(creds, configDir);
      process.stderr.write("API key cleared.\n");
      return;
    }

    const key = args.key as string | undefined;
    if (!key) {
      process.stderr.write("Error: Please provide an API key or use --clear.\n");
      process.exitCode = 1;
      return;
    }

    if (!key.startsWith(API_KEY_PREFIX)) {
      process.stderr.write(
        `Error: Invalid API key format. Key must start with "${API_KEY_PREFIX}".\n`,
      );
      process.exitCode = 1;
      return;
    }

    const creds = readCredentials(configDir);
    creds.api_key = key;
    writeCredentials(creds, configDir);
    process.stderr.write("API key set successfully.\n");
    process.stderr.write(
      "Tip: Prefer HOPKIN_API_KEY env var or file-based auth over --api-key on shared machines,\n" +
      "as command-line arguments are visible to other users via process listings.\n",
    );
  },
});
