import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@systems': path.resolve(__dirname, './src/systems'),
      '@entities': path.resolve(__dirname, './src/entities'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 3000,
    https: false,
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['three', 'cannon-es', 'howler', 'zustand'],
  },
});