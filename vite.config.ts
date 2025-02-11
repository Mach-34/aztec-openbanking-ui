import { defineConfig, Plugin, searchForWorkspaceRoot } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { PolyfillOptions, nodePolyfills } from "vite-plugin-node-polyfills";
import react from '@vitejs/plugin-react'
import topLevelAwait from "vite-plugin-top-level-await";

const nodeModulesPath = `${searchForWorkspaceRoot(process.cwd())}/node_modules`;

// Unfortunate, but needed due to https://github.com/davidmyersdev/vite-plugin-node-polyfills/issues/81
// Suspected to be because of the yarn workspace setup, but not sure
const nodePolyfillsFix = (options?: PolyfillOptions | undefined): Plugin => {
  return {
    ...nodePolyfills(options),
    /* @ts-ignore */
    resolveId(source: string) {
      const m =
        /^vite-plugin-node-polyfills\/shims\/(buffer|global|process)$/.exec(
          source,
        );
      if (m) {
        return `${nodeModulesPath}/vite-plugin-node-polyfills/shims/${m[1]}/dist/index.cjs`;
      }
    },
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [nodePolyfillsFix({ include: ["buffer", "crypto", "process", "path", "stream", "timers", "tty", "util"] }), react(), tailwindcss(), topLevelAwait(),],
})