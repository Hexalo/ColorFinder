import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { version } from './package.json'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src'),
        '@shared': resolve(__dirname, 'src/shared')
      }
    },
    plugins: [react()],
    // Surfaced in the About panel; single source of truth is package.json.
    define: { __APP_VERSION__: JSON.stringify(version) },
    build: {
      rollupOptions: {
        input: {
          // Main application window.
          index: resolve(__dirname, 'src/renderer/index.html'),
          // Fullscreen overlay used by the screen colour picker.
          picker: resolve(__dirname, 'src/renderer/picker.html'),
          // Boot splash, shown until the main window is ready.
          splash: resolve(__dirname, 'src/renderer/splash.html')
        }
      }
    }
  }
})
