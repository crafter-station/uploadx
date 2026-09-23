import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: "node20",
  banner: { js: "#!/usr/bin/env node" },
  // Injected so `--version` cannot drift from the published version.
  define: { __CLI_VERSION__: JSON.stringify(version) },
});
