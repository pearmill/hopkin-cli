import { defineCommand } from "citty";
import { hasCredentials, readCredentials } from "../../auth/credentials.js";
import { getConfigDir } from "../../config/paths.js";

export default defineCommand({
  meta: { name: "login", description: "Log in to Hopkin via OAuth or API key" },
  run() {
    const configDir = process.env.HOPKIN_CONFIG_DIR ?? getConfigDir();

    if (process.env.HOPKIN_API_KEY) {
      process.stderr.write("Already authenticated via HOPKIN_API_KEY environment variable.\n");
      return;
    }

    if (hasCredentials(configDir)) {
      const creds = readCredentials(configDir);
      if (creds.api_key) {
        process.stderr.write("Already authenticated with an API key.\n");
        process.stderr.write('Use "hopkin auth status" to see details.\n');
        return;
      }
    }

    process.stderr.write("To authenticate, use one of the following methods:\n\n");
    process.stderr.write('  1. Set an API key:  hopkin auth set-key <your-key>\n');
    process.stderr.write("  2. Set env var:     export HOPKIN_API_KEY=<your-key>\n\n");
    process.stderr.write("OAuth login will be available in a future release.\n");
  },
});
