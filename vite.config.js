import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // 0.0.0.0 でリッスンして外部からのアクセスを許可
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true // WSL2 でのファイル変更検知に必要
    }
  }
});