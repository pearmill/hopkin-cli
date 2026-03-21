import { defineCommand } from "citty";

export default defineCommand({
  meta: {
    name: "skill",
    description: "Manage Claude Code skill",
  },
  subCommands: {
    install: () => import("./install.js").then((m) => m.default),
  },
});
