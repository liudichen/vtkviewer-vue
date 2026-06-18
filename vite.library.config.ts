import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    dts({
      // 类型文件输出目录
      outDirs: 'lib/types',
      // 包含 Vue 文件
      include: ['src/**/*.ts', 'src/**/*.vue'],
      // 合并类型声明文件
      staticImport: true,
      // 插入类型声明文件中的三斜线指令
      insertTypesEntry: true,
      copyDtsFiles: true,
      exclude: ['**/_virtual/**'],
    }),    
  ],
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: resolve(__dirname, 'src') + '/'
      }
    ]
  },
  // 库模式配置
  build: {
    outDir: 'lib',
    copyPublicDir: false,
    emptyOutDir: true,
    // minify: false,
    sourcemap: false,    
    lib: {
      entry: 'src/index.ts',
      name: 'vtkviewer',
      fileName: 'vtkviewer',
      formats: ['es','umd']
    },
    rollupOptions: {
      external: ['vue',],
      output:{
        globals: {
          vue: 'Vue'
        }
      }
      // output: [
      //   {
      //   // codeSplitting:true,
      //   globals: {
      //     vue: 'Vue'
      //   },
      //   // format:'es',
      //   // preserveModules: true,
      //   // preserveModulesRoot:"src",
      //   // dir:'lib/esm',
      //   // entryFileNames: "[name].js"
      // },
      // {
      //   globals: {
      //     vue: 'Vue'
      //   },
      //   format:'umd',
      //   dir:'lib/umd',
      //   name:'vtkviewer',
      // }
    // ]
    },
  }
})
