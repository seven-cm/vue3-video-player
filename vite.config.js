import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(async () => {
  const { createSvgIconsPlugin } = await import('vite-plugin-svg-icons')

  return {
    plugins: [
      vue(),
      createSvgIconsPlugin({
        iconDirs: [path.resolve(__dirname, 'lib/assets/icon/svg')],
        symbolId: 'icon-[name]',
      }),
    ],
    build: {
      sourcemap: false, // 相当于 --no-source-map
      lib: {
        entry: path.resolve(__dirname, './lib/index.ts'), // 入口文件
        name: 'viplayerer', // 全局变量名
        formats: ['umd'], // 打包格式
        fileName: (format) => `index.${format}.js`, // 输出文件名
      },
      rollupOptions: {
        // 外部化依赖，不打包到库中
        external: ['vue', 'axios'],
        output: {
          globals: {
            vue: 'Vue', // 全局变量名
            axios: 'axios', // 全局变量名
          },
        },
      },
      outDir: 'dist', // 输出目录
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173, // 指定端口号（可选）
      host: 'localhost', // 指定主机名（可选）
      open: '/index.html', // 指定打开的路径
    },
    optimizeDeps: {
      exclude: ['axios'],
    },
  }
})
