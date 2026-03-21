import { defineCommand } from "citty";
import { getConfigValue } from "../../config/manager.js";

export default defineCommand({
  meta: { name: "get", description: "Get a configuration value" },
  args: {
    key: {
      type: "positional",
      description: "Config key (dot-path supported, e.g. meta.default_account)",
      required: true,
    },
    json: {
      type: "boolean",
      description: "Force JSON output",
      default: false,
    },
  },
  run({ args }) {
    const configDir = process.env.HOPKIN_CONFIG_DIR;
    const value = getConfigValue(args.key, configDir);

    if (value === undefined) {
      return;
    }

    if (args.json || (typeof value === "object" && value !== null)) {
      process.stdout.write(JSON.stringify(value, null, 2) + "\n");
    } else {
      process.stdout.write(String(value) + "\n");
    }
  },
});
