import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import cloudflarePlugin from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [cloudflarePlugin(), TanStackRouterVite(), react()],
  base: "/simple-api-buddy/",
});
