import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import copy from "rollup-plugin-copy";

const fetchVersion = () => {
  return {
    name: "html-transform",
    transformIndexHtml(html) {
      return html.replace(
        /__APP_VERSION__/,
        `v${process.env.npm_package_version}`
      );
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    fetchVersion(),
    copy({
      targets: [
        {
          src: "src/capture/capture.html",
          dest: "dist/src/capture",
        },
        { src: "src/capture/capture.js", dest: "dist/src/capture" },
        {
          src: "src/capture/capture.css",
          dest: "dist/src/capture",
        },
        {
          src: "src/const.js",
          dest: "dist/src",
        },
      ],
      hook: "writeBundle",
    }),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        index: new URL("./popup.html", import.meta.url).pathname,
        background: new URL("./background.html", import.meta.url).pathname,
      },
    },
  },
});
