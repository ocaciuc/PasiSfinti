import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    pool: "threads",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
