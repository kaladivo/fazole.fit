import { platitprosimUi } from "@platitprosim/ui/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [platitprosimUi(), react()],
  server: { port: 5290, strictPort: true },
  preview: { port: 5290, strictPort: true },
});
