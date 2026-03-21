import { defineCommand } from "citty";

export default defineCommand({
  meta: {
    name: "config",
    description: "Manage CLI configuration",
  },
  subCommands: {
    set: () => import("./set.js").then((m) => m.default),
    get: () => import("./get.js").then((m) => m.default),
    unset: () => import("./unset.js").then((m) => m.default),
  },
});
