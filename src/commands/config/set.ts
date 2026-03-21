import { defineCommand } from "citty";
import { setConfigValue } from "../../config/manager.js";

export default defineCommand({
  meta: { name: "set", description: "Set a configuration value" },
  args: {
    key: {
      type: "positional",
      description: "Config key (dot-path supported, e.g. meta.default_account)",
      required: true,
    },
    value: {
      type: "positional",
      description: "Value to set",
      required: true,
    },
  },
  run({ args }) {
    const configDir = process.env.HOPKIN_CONFIG_DIR;
    setConfigValue(args.key, args.value, configDir);
    process.stderr.write(`Set ${args.key} = ${args.value}\n`);
  },
});
