import app from './app.js'
import express from 'express'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const sitePath = resolve('dist')
app.use('/api', (_req, res) => res.status(404).json({ error: 'API_ROUTE_NOT_FOUND' }))
if (existsSync(resolve(sitePath, 'index.html'))) {
  app.use(express.static(sitePath))
  app.get('/{*path}', (_req, res) => res.sendFile(resolve(sitePath, 'index.html')))
}
const port = Number(process.env.PORT) || 3001
const server = app.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`KomekAI website and API ready on port ${port}`))
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)))
