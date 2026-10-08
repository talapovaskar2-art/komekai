import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), {
      name: 'komekai-local-api',
      async configureServer(server) {
        const { default: app } = await import('./server/app.js')
        server.middlewares.use(app)
        console.log('KomekAI API connected to the website on port 5173')
      },
      async configurePreviewServer(server) {
        const { default: app } = await import('./server/app.js')
        server.middlewares.use(app)
      }
    }],
    server: { host: '127.0.0.1', port: 5173, strictPort: true },
    preview: { host: '127.0.0.1', port: 5173, strictPort: true }
  }
})
