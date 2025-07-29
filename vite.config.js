import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.', // project root
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'public/index.html')
    },
    outDir: 'dist',
    emptyOutDir: true
  }
});
