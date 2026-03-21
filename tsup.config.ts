import { defineConfig } from "tsup";
import { copyFileSync } from "node:fs";

export default defineConfig({
  entry: { hopkin: "src/main.ts" },
  format: ["cjs"],
  outDir: "dist",
  target: "node20",
  clean: true,
  minify: false,
  sourcemap: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  noExternal: [/.*/],
  outExtension() {
    return { js: ".cjs" };
  },
  onSuccess() {
    // Copy skill file into dist for packaging
    copyFileSync("skill/SKILL.md", "dist/hopkin-cli.skill");
  },
});
