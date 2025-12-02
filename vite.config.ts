import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './src/core'),
      '@world': path.resolve(__dirname, './src/world'),
      '@agent': path.resolve(__dirname, './src/agent'),
      '@learning': path.resolve(__dirname, './src/learning'),
      '@reasoning': path.resolve(__dirname, './src/reasoning'),
      '@nested': path.resolve(__dirname, './src/nested'),
      '@interpretability': path.resolve(__dirname, './src/interpretability'),
      '@viz': path.resolve(__dirname, './src/viz'),
      '@config': path.resolve(__dirname, './src/config'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
