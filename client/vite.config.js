import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 5173 sits inside a Windows-reserved port range (Hyper-V/WSL) on this machine
    port: 5273,
    proxy: {
      '/api': { target: 'http://localhost:5001', changeOrigin: true },
    },
  },
});
