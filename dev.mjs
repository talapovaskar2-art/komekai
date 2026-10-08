import { spawn } from 'node:child_process'

const web = spawn(process.execPath, ['--env-file-if-exists=.env', 'node_modules/vite/bin/vite.js'], { cwd: process.cwd(), stdio: 'inherit', windowsHide: true })
web.on('error', error => { console.error('KomekAI could not start:', error.message); process.exitCode = 1 })
web.on('exit', code => { process.exitCode = code ?? 0 })
process.on('SIGINT', () => web.kill())
process.on('SIGTERM', () => web.kill())
