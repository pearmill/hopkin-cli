import { defineCommand } from "citty";
import { unsetConfigValue } from "../../config/manager.js";

export default defineCommand({
  meta: { name: "unset", description: "Remove a configuration value" },
  args: {
    key: {
      type: "positional",
      description: "Config key to remove (dot-path supported)",
      required: true,
    },
  },
  run({ args }) {
    const configDir = process.env.HOPKIN_CONFIG_DIR;
    unsetConfigValue(args.key, configDir);
    process.stderr.write(`Unset ${args.key}\n`);
  },
});
