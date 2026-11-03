
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        resume: resolve(__dirname, 'resume.html'),
        certificates: resolve(__dirname, 'certificates.html'),
        projects: resolve(__dirname, 'projects.html'),
      },
    },
  },
});
