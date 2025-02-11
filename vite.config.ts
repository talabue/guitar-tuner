import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/guitar-tuner/", // ✅ Set this to match your GitHub repo name
  plugins: [react()],
  css: {
    postcss: "./postcss.config.cjs", // ✅ Ensure it points to the new file
  },
});
