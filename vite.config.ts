import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { looksPages } from "./build/looks-pages";

export default defineConfig({
  plugins: [react(), looksPages()],
  server: {
    host: "127.0.0.1",
    port: 4173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
  test: {
    environment: "node",
    coverage: {
      reporter: ["text", "json-summary"],
    },
  },
});
