import { defineCommand } from "citty";
import { clearCredentials } from "../../auth/credentials.js";
import { getConfigDir } from "../../config/paths.js";

export default defineCommand({
  meta: { name: "logout", description: "Log out and remove stored credentials" },
  run() {
    const configDir = process.env.HOPKIN_CONFIG_DIR ?? getConfigDir();
    clearCredentials(configDir);
    process.stderr.write("Logged out. Credentials removed.\n");
  },
});
