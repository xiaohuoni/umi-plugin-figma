import { defineConfig } from 'umi';

export default defineConfig({
  plugins: ['../dist/index'],
  figma: {},
  writeToDisk: true,
});
