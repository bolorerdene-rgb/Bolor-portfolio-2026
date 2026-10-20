import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, "index.html"),
        olist: resolve(__dirname, "olist.html"),
        retail: resolve(__dirname, "retail.html"),
        pump: resolve(__dirname, "pump.html"),
      },
    },
  },
});
