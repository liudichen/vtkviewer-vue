import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: resolve(__dirname, 'src') + '/'
      }
    ]
  },
  server: {
    host: '0.0.0.0',
    // 静态资源目录配置
    fs: {
      // 允许访问项目根目录外的文件
      allow: ['..']
    }
  },
  // 静态资源目录
  publicDir: 'public',
  // 构建配置（应用模式）
  build: {
    outDir: 'dist',
    // 静态资源处理
    assetsDir: 'assets',
    // 资源文件名模式
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  // 静态资源别名
  assetsInclude: ['**/*.stl', '**/*.obj', '**/*.ply']
})
