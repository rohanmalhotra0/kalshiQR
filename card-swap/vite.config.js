import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../static/card-swap',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      output: {
        entryFileNames: 'card-swap.js',
        chunkFileNames: 'card-swap-[name].js',
        assetFileNames: 'card-swap.[ext]',
      },
    },
  },
});
