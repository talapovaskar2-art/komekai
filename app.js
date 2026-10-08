import express from 'express'
import { randomBytes, createHash } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import { db, studentSnapshot } from './db.js'
import { diagnosticQuestions, educationalProfile, getLesson, localize, publicCatalog } from './content.js'
import { endSession, makePassword, newId, requireAuth, requireParent, requireStudent, safeUser, startSession, verifyPassword, withUser } from './auth.js'

const app = express()
app.set('trust proxy', 1)
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
app.use(express.json({ limit: '1mb' }))
app.use(withUser)
const fail = (res, status, error) => res.status(status).json({ error })
const key = () => process.env.GROQ_API_KEY
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qyzylorda', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

const googleReady = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI)
app.get('/api/status', (_req, res) => res.json({ service: 'komekai', provider: 'groq', configured: Boolean(key()), googleConfigured: googleReady() }))
app.get('/api/me', (req, res) => res.json({ user: safeUser(req.user) || null }))
app.post('/api/auth/register', (req, res) => {
  const { email, password, role, firstName, lastName = '' } = req.body || {}
  if (typeof email !== 'string' || !emailPattern.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 128 || !['student','parent'].includes(role) || typeof firstName !== 'string' || !firstName.trim() || firstName.length > 70) return fail(res,400,'INVALID_REGISTRATION')
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim())) return fail(res,409,'EMAIL_EXISTS')
  const id = newId()
  db.exec('BEGIN')
  try {
    db.prepare('INSERT INTO users (id,email,password_hash,role,first_name,last_name) VALUES (?,?,?,?,?,?)').run(id,email.toLowerCase().trim(),makePassword(password),role,firstName.trim(),String(lastName).trim().slice(0,70))
    db.prepare('INSERT INTO preferences (user_id) VALUES (?)').run(id)
    if (role === 'student') { db.prepare('INSERT INTO student_profiles (user_id) VALUES (?)').run(id); db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').run(id) }
    db.exec('COMMIT')
  } catch { db.exec('ROLLBACK'); return fail(res,500,'REGISTRATION_FAILED') }
  startSession(res,id,req.secure)
  res.status(201).json({ user: safeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) })
})
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  if (typeof email !== 'string' || typeof password !== 'string') return fail(res,400,'INVALID_LOGIN')
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim())
  if (!user || !verifyPassword(password,user.password_hash)) return fail(res,401,'INVALID_CREDENTIALS')
  startSession(res,user.id,req.secure)
  res.json({ user: safeUser(user) })
})
app.post('/api/auth/logout', requireAuth, (req, res) => { endSession(req,res); res.json({ ok: true }) })
const googleStates = new Map()
const googleClient = () => new OAuth2Client(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,process.env.GOOGLE_REDIRECT_URI)
app.get('/api/auth/google', (req, res) => {
  if (!googleReady()) return fail(res,503,'GOOGLE_NOT_CONFIGURED')
  const role = req.query.role === 'parent' ? 'parent' : 'student'
  const state = randomBytes(24).toString('base64url')
  googleStates.set(state,{ role, expires: Date.now()+600000 })
  res.redirect(googleClient().generateAuthUrl({ access_type: 'online', scope: ['openid','email','profile'], state, prompt: 'select_account' }))
})
app.get('/api/auth/google/callback', async (req, res) => {
  const entry = googleStates.get(String(req.query.state || ''))
  googleStates.delete(String(req.query.state || ''))
  const origin = process.env.APP_ORIGIN || 'http://localhost:5173'
  const redirectError = code => res.redirect(`${origin}/?authError=${encodeURIComponent(code)}`)
  if (!entry || entry.expires < Date.now() || !req.query.code) return redirectError('GOOGLE_STATE_INVALID')
  try {
    const client = googleClient()
    const { tokens } = await client.getToken(String(req.query.code))
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    if (!payload?.email_verified || !payload.email || !payload.sub) return redirectError('GOOGLE_ID_INVALID')
    let user = db.prepare('SELECT * FROM users WHERE google_sub = ?').get(payload.sub)
    if (!user) {
      if (db.prepare('SELECT id FROM users WHERE email = ?').get(payload.email.toLowerCase())) return redirectError('EMAIL_EXISTS')
      const id = newId()
      db.exec('BEGIN')
      try {
        db.prepare('INSERT INTO users (id,email,google_sub,role,first_name,last_name) VALUES (?,?,?,?,?,?)').run(id,payload.email.toLowerCase(),payload.sub,entry.role,payload.given_name || payload.name || 'Ученик',payload.family_name || '')
        db.prepare('INSERT INTO preferences (user_id) VALUES (?)').run(id)
        if (entry.role === 'student') { db.prepare('INSERT INTO student_profiles (user_id) VALUES (?)').run(id); db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').run(id) }
        db.exec('COMMIT')
      } catch { db.exec('ROLLBACK'); return redirectError('REGISTRATION_FAILED') }
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    }
    startSession(res,user.id,req.secure)
    res.redirect(`${origin}/?auth=google`)
  } catch { redirectError('GOOGLE_AUTH_FAILED') }
})

app.get('/api/state', requireStudent, (req, res) => res.json({ user: safeUser(req.user), ...studentSnapshot(req.user.id) }))
app.post('/api/onboarding', requireStudent, (req, res) => {
  const { firstName, lastName = '', age, grade, conditions = [], difficulties = [], preferredFormat = 'step' } = req.body || {}
  if (typeof firstName !== 'string' || !firstName.trim() || !Number.isInteger(Number(age)) || age < 6 || age > 21 || !Number.isInteger(Number(grade)) || grade < 1 || grade > 12 || !Array.isArray(conditions) || !Array.isArray(difficulties) || conditions.length > 10 || difficulties.length > 10 || !['step','visual','example'].includes(preferredFormat)) return fail(res,400,'INVALID_ONBOARDING')
  db.exec('BEGIN')
  try {
    db.prepare('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?').run(firstName.trim(),String(lastName).trim().slice(0,70),req.user.id)
    db.prepare('UPDATE student_profiles SET age = ?, grade = ?, conditions_json = ?, difficulties_json = ?, onboarding_complete = 1 WHERE user_id = ?').run(Number(age),Number(grade),JSON.stringify(conditions.map(String)),JSON.stringify(difficulties.map(String)),req.user.id)
    db.prepare('UPDATE preferences SET preferred_format = ? WHERE user_id = ?').run(preferredFormat,req.user.id)
    db.exec('COMMIT')
  } catch { db.exec('ROLLBACK'); return fail(res,500,'ONBOARDING_FAILED') }
  res.json({ user: safeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)), ...studentSnapshot(req.user.id) })
})
app.get('/api/diagnostic/questions', requireStudent, (_req, res) => res.json({ questions: diagnosticQuestions.map(({ answer, ...question }) => question) }))
app.post('/api/diagnostic', requireStudent, (req, res) => {
  const answers = req.body?.answers
  if (!Array.isArray(answers) || answers.length !== diagnosticQuestions.length || new Set(answers.map(item => item.id)).size !== diagnosticQuestions.length || answers.some(item => !diagnosticQuestions.find(q => q.id === item.id) || !Number.isInteger(Number(item.choice)) || Number(item.choice) < 0 || Number(item.choice) > 2)) return fail(res,400,'INVALID_DIAGNOSTIC')
  const profile = educationalProfile(answers)
  db.exec('BEGIN')
  try {
    db.prepare('INSERT INTO diagnostics (id,user_id,answers_json,result_json) VALUES (?,?,?,?)').run(newId(),req.user.id,JSON.stringify(answers),JSON.stringify(profile))
    db.prepare('UPDATE student_profiles SET learning_profile_json = ? WHERE user_id = ?').run(JSON.stringify(profile),req.user.id)
    db.prepare('UPDATE preferences SET preferred_format = ? WHERE user_id = ?').run(profile.preferredFormat,req.user.id)
    db.exec('COMMIT')
  } catch { db.exec('ROLLBACK'); return fail(res,500,'DIAGNOSTIC_FAILED') }
  res.json({ profile })
})
app.get('/api/catalog', requireAuth, (_req, res) => res.json({ subjects: publicCatalog() }))
app.get('/api/lesson/:id', requireAuth, (req, res) => {
  const found = getLesson(req.params.id)
  if (!found) return fail(res,404,'LESSON_NOT_FOUND')
  const { answer, explanation, errorPattern, ...exercise } = found.exercise
  res.json({ lesson: { ...found, exercise } })
})

function updateStreak(userId) {
  const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId)
  const date = today()
  if (stats.last_activity_date === date) return
  const previous = new Date(`${date}T12:00:00Z`)
  previous.setUTCDate(previous.getUTCDate()-1)
  const streak = stats.last_activity_date === previous.toISOString().slice(0,10) ? stats.streak+1 : 1
  db.prepare('UPDATE user_stats SET streak = ?, last_activity_date = ? WHERE user_id = ?').run(streak,date,userId)
}
app.post('/api/attempt', requireStudent, (req, res) => {
  const { lessonId, exerciseId, answer, durationMs = 0 } = req.body || {}
  const selected = getLesson(lessonId)
  if (!selected || selected.exercise.id !== exerciseId || (typeof answer !== 'string' && !Array.isArray(answer))) return fail(res,400,'INVALID_ATTEMPT')
  const exercise = selected.exercise
  const normalized = Array.isArray(answer) ? answer.map(String) : String(answer).trim().toLowerCase().replace(',','.')
  const correct = Array.isArray(exercise.answer) ? Array.isArray(normalized) && normalized.join('|') === exercise.answer.join('|') : normalized === exercise.answer
  db.exec('BEGIN')
  let gained = 0
  let recommendedFormat = null
  try {
    const existing = db.prepare('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(req.user.id,lessonId)
    db.prepare('INSERT INTO attempts (id,user_id,lesson_id,exercise_id,answer_json,correct,error_pattern,duration_ms) VALUES (?,?,?,?,?,?,?,?)').run(newId(),req.user.id,lessonId,exerciseId,JSON.stringify(answer),Number(correct),correct ? null : exercise.errorPattern,Math.min(600000,Math.max(0,Number(durationMs)||0)))
    if (correct) {
      gained = existing?.status === 'completed' ? 5 : 30
      db.prepare("INSERT INTO lesson_progress (user_id,lesson_id,status,mastery,best_score,completed_at) VALUES (?,?,'completed',1,1,CURRENT_TIMESTAMP) ON CONFLICT(user_id,lesson_id) DO UPDATE SET status='completed',mastery=1,best_score=1,completed_at=COALESCE(lesson_progress.completed_at,CURRENT_TIMESTAMP)").run(req.user.id,lessonId)
      db.prepare('UPDATE user_stats SET xp = xp + ?, level = 1 + CAST((xp + ?) / 150 AS INTEGER) WHERE user_id = ?').run(gained,gained,req.user.id)
      const count = db.prepare("SELECT count(*) AS n FROM lesson_progress WHERE user_id = ? AND status = 'completed'").get(req.user.id).n
      if (count === 1) db.prepare('INSERT OR IGNORE INTO achievements (user_id,achievement_id) VALUES (?,?)').run(req.user.id,'first-lesson')
      if (count === 5) db.prepare('INSERT OR IGNORE INTO achievements (user_id,achievement_id) VALUES (?,?)').run(req.user.id,'five-lessons')
    } else {
      if (!existing) db.prepare("INSERT INTO lesson_progress (user_id,lesson_id,status,mastery,best_score) VALUES (?,?,'needs-practice',0,0)").run(req.user.id,lessonId)
      const misses = db.prepare('SELECT count(*) AS n FROM attempts WHERE user_id = ? AND lesson_id = ? AND correct = 0').get(req.user.id,lessonId).n
      if (existing?.status !== 'completed') db.prepare('UPDATE lesson_progress SET mastery = ? WHERE user_id = ? AND lesson_id = ?').run(Math.max(0,0.5 - misses * 0.15),req.user.id,lessonId)
      if (misses >= 2 && misses % 2 === 0) {
        const current = db.prepare('SELECT preferred_format FROM preferences WHERE user_id = ?').get(req.user.id)?.preferred_format || 'step'
        recommendedFormat = { step: 'visual', visual: 'example', example: 'step' }[current]
        db.prepare('UPDATE preferences SET preferred_format = ? WHERE user_id = ?').run(recommendedFormat,req.user.id)
        const row = db.prepare('SELECT learning_profile_json FROM student_profiles WHERE user_id = ?').get(req.user.id)
        const profile = JSON.parse(row?.learning_profile_json || '{}')
        profile.preferredFormat = recommendedFormat
        profile.lessonMinutes = Math.min(Number(profile.lessonMinutes) || 10,7)
        profile.pace = 'gentle'
        profile.attentionConsistency = 'short-blocks'
        profile.recentErrorPattern = exercise.errorPattern
        db.prepare('UPDATE student_profiles SET learning_profile_json = ? WHERE user_id = ?').run(JSON.stringify(profile),req.user.id)
      }
    }
    updateStreak(req.user.id)
    db.exec('COMMIT')
  } catch { db.exec('ROLLBACK'); return fail(res,500,'ATTEMPT_FAILED') }
  res.json({ correct, explanation: exercise.explanation, errorPattern: correct ? null : exercise.errorPattern, xpGained: gained, recommendedFormat, state: studentSnapshot(req.user.id) })
})
app.patch('/api/preferences', requireAuth, (req, res) => {
  const allowed = { locale: ['ru','kk'], text_scale: ['normal','large','extra'], line_spacing: ['normal','wide'], contrast: ['normal','high'], preferred_format: ['step','visual','example'] }
  const updates = [], values = []
  for (const [field, options] of Object.entries(allowed)) if (field in (req.body || {})) {
    if (!options.includes(req.body[field])) return fail(res,400,'INVALID_PREFERENCE')
    updates.push(`${field} = ?`); values.push(req.body[field])
  }
  for (const field of ['reduced_motion','focus_mode','captions']) if (field in (req.body || {})) { updates.push(`${field} = ?`); values.push(Number(Boolean(req.body[field]))) }
  if (!updates.length) return fail(res,400,'INVALID_PREFERENCE')
  db.prepare(`UPDATE preferences SET ${updates.join(', ')} WHERE user_id = ?`).run(...values,req.user.id)
  res.json({ preferences: db.prepare('SELECT * FROM preferences WHERE user_id = ?').get(req.user.id) })
})
app.post('/api/parent/code', requireStudent, (req, res) => {
  const code = randomBytes(5).toString('hex').toUpperCase()
  db.prepare('INSERT INTO link_codes (code_hash,student_id,expires_at) VALUES (?,?,?)').run(createHash('sha256').update(code).digest('hex'),req.user.id,Date.now()+900000)
  res.json({ code, expiresInMinutes: 15 })
})
app.post('/api/parent/link', requireParent, (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase()
  const hash = createHash('sha256').update(code).digest('hex')
  const row = db.prepare('SELECT * FROM link_codes WHERE code_hash = ? AND expires_at > ?').get(hash,Date.now())
  if (!row) return fail(res,400,'INVALID_LINK_CODE')
  db.prepare('INSERT OR IGNORE INTO parent_links (parent_id,student_id) VALUES (?,?)').run(req.user.id,row.student_id)
  db.prepare('DELETE FROM link_codes WHERE code_hash = ?').run(hash)
  res.json({ ok: true })
})
app.get('/api/parent/children', requireParent, (req, res) => {
  const children = db.prepare('SELECT users.id,users.first_name,users.last_name FROM parent_links JOIN users ON users.id = parent_links.student_id WHERE parent_links.parent_id = ?').all(req.user.id)
  res.json({ children: children.map(child => ({ id: child.id, firstName: child.first_name, lastName: child.last_name, ...studentSnapshot(child.id) })) })
})

const aiRequests = new Map()
function aiLimit(req, res, next) {
  const now = Date.now(), recent = (aiRequests.get(req.user.id) || []).filter(time => now-time < 60000)
  if (recent.length >= 12) return fail(res,429,'AI_RATE_LIMIT')
  recent.push(now); aiRequests.set(req.user.id,recent); next()
}
function upstreamError(res, status, data) {
  const message = data?.error?.message || ''
  if (data?.error?.code === 'insufficient_quota' || /no credits|billing/i.test(message)) return fail(res,503,'AI_CREDITS_MISSING')
  if (status === 401) return fail(res,503,'AI_KEY_INVALID')
  return fail(res,502,'AI_UNAVAILABLE')
}
app.get('/api/tutor/history', requireStudent, (req, res) => res.json({ messages: db.prepare('SELECT role,content,lesson_id,created_at FROM tutor_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(req.user.id).reverse() }))
app.post('/api/tutor', requireStudent, aiLimit, async (req, res) => {
  if (!key()) return fail(res,503,'AI_KEY_MISSING')
  const { message, lessonId = null, mode = 'tutor', locale = 'ru' } = req.body || {}
  if (typeof message !== 'string' || !message.trim() || message.length > 4000 || !['tutor','assistant'].includes(mode)) return fail(res,400,'INVALID_MESSAGE')
  const snapshot = studentSnapshot(req.user.id), selected = lessonId ? getLesson(lessonId) : null
  const recent = db.prepare('SELECT role,content FROM tutor_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 8').all(req.user.id).reverse()
  const language = locale === 'kk' ? 'қазақ тілінде' : 'на русском языке'
  const instructions = mode === 'assistant'
    ? `Ты помощник учебной платформы KomekAI. Отвечай ${language}. Помогай с навигацией и учебным планом. Не ставь медицинские диагнозы. Доступны диагностика, пять предметов, уроки, упражнения, прогресс, голосовой разбор и настройки.`
    : `Ты доброжелательный школьный тьютор KomekAI. Отвечай ${language}. Пиши короткими фразами, по одному шагу. Не ставь медицинские диагнозы. Помогай рассуждать, не выдавай полный ответ до попытки. Тема: ${selected ? localize(selected.title,locale) : 'общая учёба'}. Объяснение: ${selected ? localize(selected.theory,locale) : ''}. Учебный профиль: ${JSON.stringify(snapshot.profile?.learningProfile || {}).slice(0,1200)}. Последние ошибки: ${JSON.stringify(snapshot.attempts.filter(a => !a.correct).slice(0,5).map(a => a.error_pattern))}.`
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b', messages: [{ role: 'system', content: instructions }, ...recent.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: message.trim() }], max_completion_tokens: 1000 }) })
    const data = await response.json()
    if (!response.ok) return upstreamError(res,response.status,data)
    const text = data.choices?.[0]?.message?.content?.trim() || ''
    if (!text) return fail(res,502,'AI_UNAVAILABLE')
    db.prepare('INSERT INTO tutor_messages (id,user_id,role,content,lesson_id) VALUES (?,?,?,?,?)').run(newId(),req.user.id,'user',message.trim(),selected?.id || null)
    db.prepare('INSERT INTO tutor_messages (id,user_id,role,content,lesson_id) VALUES (?,?,?,?,?)').run(newId(),req.user.id,'assistant',text,selected?.id || null)
    res.json({ text })
  } catch { fail(res,502,'AI_UNAVAILABLE') }
})
app.post('/api/transcribe', requireStudent, aiLimit, async (req, res) => {
  if (!key()) return fail(res,503,'AI_KEY_MISSING')
  const type = String(req.headers['content-type'] || '')
  if (!type.startsWith('audio/')) return fail(res,400,'INVALID_AUDIO')
  const chunks = []; let size = 0
  for await (const chunk of req) { size += chunk.length; if (size > 12 * 1024 * 1024) return fail(res,413,'AUDIO_TOO_LARGE'); chunks.push(chunk) }
  if (!size) return fail(res,400,'INVALID_AUDIO')
  const form = new FormData()
  form.append('file', new Blob(chunks, { type }), type.includes('mp4') ? 'explanation.m4a' : 'explanation.webm')
  form.append('model', process.env.GROQ_TRANSCRIPTION_MODEL || 'whisper-large-v3-turbo')
  try {
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', signal: AbortSignal.timeout(45000), headers: { Authorization: `Bearer ${key()}` }, body: form })
    const data = await response.json()
    if (!response.ok) return upstreamError(res,response.status,data)
    res.json({ text: data.text || '' })
  } catch { fail(res,502,'TRANSCRIPTION_UNAVAILABLE') }
})
app.use((err, _req, res, _next) => { console.error('Request error:',err?.message); fail(res,500,'INTERNAL_ERROR') })
export default app
