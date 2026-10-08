import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { db } from './db.js'

const hash = value => createHash('sha256').update(value).digest('hex')
const cookieName = 'komekai_session'
const maxAge = 30 * 24 * 60 * 60 * 1000

export const newId = () => randomUUID()
export const safeUser = row => row && ({ id: row.id, email: row.email, role: row.role, firstName: row.first_name, lastName: row.last_name, createdAt: row.created_at })
export function makePassword(password) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}
export function verifyPassword(password, stored) {
  if (!stored) return false
  const [salt, key] = stored.split(':')
  if (!salt || !key) return false
  const candidate = scryptSync(password, salt, 64)
  const original = Buffer.from(key, 'hex')
  return original.length === candidate.length && timingSafeEqual(candidate, original)
}
export function startSession(res, userId, secure = false) {
  const token = randomBytes(32).toString('base64url')
  db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').run(hash(token), userId, Date.now() + maxAge)
  res.cookie(cookieName, token, { httpOnly: true, sameSite: 'lax', secure, maxAge, path: '/' })
}
export function endSession(req, res) {
  if (req.sessionToken) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash(req.sessionToken))
  res.clearCookie(cookieName, { path: '/' })
}
export function withUser(req, _res, next) {
  const cookie = String(req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))
  const token = cookie ? decodeURIComponent(cookie.slice(cookieName.length + 1)) : null
  req.sessionToken = token
  if (token) {
    const session = db.prepare('SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?').get(hash(token), Date.now())
    if (session) req.user = session
  }
  next()
}
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'AUTH_REQUIRED' })
  next()
}
export function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') return res.status(403).json({ error: 'STUDENT_ONLY' })
  next()
}
export function requireParent(req, res, next) {
  if (!req.user || req.user.role !== 'parent') return res.status(403).json({ error: 'PARENT_ONLY' })
  next()
}
