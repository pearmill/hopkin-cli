import { defineCommand } from "citty";

export default defineCommand({
  meta: {
    name: "apikeys",
    description: "Manage API keys",
  },
  subCommands: {
    list: () => import("./list.js").then((m) => m.default),
    create: () => import("./create.js").then((m) => m.default),
    delete: () => import("./delete.js").then((m) => m.default),
  },
});
