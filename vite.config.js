import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }) => ({
  plugins: mode === "phone" ? [basicSsl({ name: "InsightXR local development" })] : [],
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
}));
