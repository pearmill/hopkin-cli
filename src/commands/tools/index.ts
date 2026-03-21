import { defineCommand } from "citty";

export default defineCommand({
  meta: {
    name: "tools",
    description: "Manage MCP tool discovery",
  },
  subCommands: {
    refresh: () => import("./refresh.js").then((m) => m.default),
    list: () => import("./list.js").then((m) => m.default),
  },
});
