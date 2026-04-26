import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "server/index": "src/server/index.ts",
    "client/index": "src/client/index.ts",
    "next/index": "src/next/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["next", "react", "react-dom"],
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
});
