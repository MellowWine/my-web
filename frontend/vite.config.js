import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
   base: '/', // <-- 确保 'my-vue-sqlite-app' 是你的 GitHub 仓库名
  plugins: [
    vue(),
    vueDevTools(),
  ],
    build: {
    sourcemap: true // 确保这一行为 true
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
