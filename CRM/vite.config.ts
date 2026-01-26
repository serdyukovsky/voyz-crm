import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Оптимизация для dev-режима: быстрый refresh без проверки типов
      fastRefresh: true,
      // Отключаем проверку типов в runtime для ускорения
      babel: {
        plugins: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    // Кеширование резолва модулей
    dedupe: ['react', 'react-dom'],
  },
  // Кеширование для ускорения сборки
  cacheDir: 'node_modules/.vite',
  server: {
    host: '0.0.0.0', // Слушать на всех интерфейсах для codespace
    port: 5173,
    allowedHosts: ['tripsystem.ru', 'www.tripsystem.ru', '91.210.106.218', 'localhost'],
    open: true,
    // Оптимизация hot-reload
    hmr: {
      overlay: false,
      host: 'localhost',
      port: 5173,
      // Отключаем частую проверку
      timeout: 30000,
    },
    // Предзагрузка часто используемых модулей
    warmup: {
      clientFiles: [
        './src/App.tsx',
        './src/main.tsx',
        './components/crm/layout.tsx',
      ],
    },
    // Оптимизация файловой системы
    fs: {
      // Разрешаем доступ только к нужным директориям
      allow: ['..'],
      // Кеширование статических файлов
      cachedChecks: true,
    },
    // Оптимизация производительности
    watch: {
      // Игнорируем ненужные файлы
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.next/**', '**/.npm/**'],
      // Отключаем polling для скорости
      usePolling: false,
      interval: 1000,
      binaryInterval: 2000,
    },
  },
  // Оптимизация сборки
  build: {
    outDir: 'dist',
    // Sourcemaps только для production (ускоряет dev)
    sourcemap: false,
    // Минификация только для production
    minify: 'esbuild',
    // Увеличиваем лимит для больших чанков
    chunkSizeWarningLimit: 1000,
    // Оптимизация rollup
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          // Heavy libraries
          'charts-vendor': ['recharts'],
          'socket-vendor': ['socket.io-client'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
        // Оптимизация имен чанков для кеширования
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Оптимизация esbuild
    target: 'esnext',
    // Увеличиваем лимит для больших файлов
    assetsInlineLimit: 4096,
  },
  // Оптимизация зависимостей
  optimizeDeps: {
    // Предкомпиляция часто используемых зависимостей
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      'date-fns',
      'clsx',
      'tailwind-merge',
    ],
    // Исключаем dev-инструменты
    exclude: ['@tanstack/react-query-devtools'],
    // Оптимизация esbuild для зависимостей
    esbuildOptions: {
      target: 'esnext',
      // Отключаем minify для dev
      minify: false,
    },
    // Принудительная оптимизация (кеширование)
    force: false,
  },
  // Оптимизация esbuild
  esbuild: {
    // Отключаем minify в dev-режиме
    minify: false,
    logLevel: 'silent',
    // Ускоряем компиляцию
    target: 'esnext',
    // Отключаем sourcemaps в dev
    sourcemap: false,
    // Оптимизация для React
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    // Увеличиваем лимит для больших файлов
    logLimit: 1000,
  },
  // Оптимизация worker
  worker: {
    format: 'es',
    plugins: () => [],
  },
  // Оптимизация логирования
  logLevel: 'warn',
  clearScreen: false,
})

