import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { plugin as mdPlugin, Mode } from 'vite-plugin-markdown'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Resolve mdDir relative to this config file's directory
  const mdDir = path.resolve(__dirname, env.VITE_MD_DIR || '../../day')

  return {
    plugins: [
      react(),
      mdPlugin({
        mode: [Mode.HTML],
      }),
    ],
    resolve: {
      alias: {
        // @md resolves to the directory configured via VITE_MD_DIR in .env
        '@md': mdDir,
      },
    },
    // When deploying to /btc_trading_analysis/ sub-path on the server
    base: '/btc_trading_analysis/',
  }
})
