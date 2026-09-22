import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (/node_modules\/(react|react-dom|react-router)\//.test(id)) {
            return 'vendor-react';
          }

          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }

          return undefined;
        },
      },
    },
  },
});
