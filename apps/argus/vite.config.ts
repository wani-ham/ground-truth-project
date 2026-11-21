import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const GAIA_DIR = fileURLToPath(new URL('../gaia/', import.meta.url))

/** Mirrors the deployed /argus/ and /gaia/ paths so links between the apps work in dev. */
function serveGaiaInDev(): Plugin {
  return {
    name: 'serve-gaia-in-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? '').split('?')[0]
        const redirect = path === '/argus' || path === '/argus/' ? '/' : path === '/gaia' ? '/gaia/' : null
        if (redirect) {
          res.statusCode = 302
          res.setHeader('Location', redirect)
          res.end()
          return
        }

        const font = path.match(/^\/gaia\/fonts\/([a-z0-9-]+\.woff2)$/)
        const file = path === '/gaia/' ? 'index.html' : font ? `fonts/${font[1]}` : null
        if (!file) return next()

        try {
          const body = await readFile(`${GAIA_DIR}${file}`)
          res.setHeader('Content-Type', font ? 'font/woff2' : 'text/html; charset=utf-8')
          res.end(body)
        } catch {
          next()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serveGaiaInDev()],
  test: { environment: 'node' },
})
