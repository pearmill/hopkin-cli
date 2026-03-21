import { defineConfig } from "tsup";

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
});
