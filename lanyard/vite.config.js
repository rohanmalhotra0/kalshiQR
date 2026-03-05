import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../static/lanyard',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      output: {
        entryFileNames: 'lanyard.js',
        chunkFileNames: 'lanyard-[name].js',
        assetFileNames: 'lanyard.[ext]',
      },
    },
  },
  assetsInclude: ['**/*.glb'],
});
