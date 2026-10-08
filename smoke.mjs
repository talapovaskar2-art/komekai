import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { diagnosticQuestions, getLesson } from '../server/content.js'

const temp = await mkdtemp(join(tmpdir(), 'komekai-smoke-'))
const port = 3197
const base = `http://127.0.0.1:${port}/api`
const args = process.argv.includes('--web') ? ['node_modules/vite/bin/vite.js','--port',String(port)] : ['server/index.js']
const server = spawn(process.execPath, args, { cwd: process.cwd(), env: { ...process.env, PORT: String(port), KOMEKAI_DB_PATH: join(temp, 'test.sqlite'), GROQ_API_KEY: '' }, stdio: 'ignore' })
let studentCookie = '', parentCookie = ''
async function request(path, method = 'GET', body, cookie = '') {
  const response = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const data = await response.json()
  return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] }
}
function ensure(condition, message) { if (!condition) throw new Error(message) }
try {
  let ready = false
  for (let i = 0; i < 120; i++) {
    try { await request('/status'); ready = true; break } catch { await new Promise(resolve => setTimeout(resolve, 250)) }
  }
  ensure(ready, 'Server did not start')
  if (process.argv.includes('--production')) {
    const page = await fetch(`http://127.0.0.1:${port}/`)
    ensure(page.ok && (await page.text()).includes('id="root"'), 'Production website is missing')
    const unknown = await request('/missing-route')
    ensure(unknown.response.status === 404 && unknown.data.error === 'API_ROUTE_NOT_FOUND', 'API routes fall through to HTML')
  }
  const health=await request('/status')
  ensure(health.data.service==='komekai' && health.data.provider==='groq', 'Wrong API provider or server')
  const student = await request('/auth/register', 'POST', { email: 'student@example.test', password: 'SmokePassword123', role: 'student', firstName: 'Тест' })
  ensure(student.response.status === 201 && student.cookie, 'Student registration failed')
  studentCookie = student.cookie
  const empty = await request('/state', 'GET', null, studentCookie)
  ensure(empty.data.stats.xp === 0 && empty.data.progress.length === 0, 'New student has artificial progress')
  const onboarding = await request('/onboarding', 'POST', { firstName: 'Тест', age: 13, grade: 7, conditions: [], difficulties: ['0'], preferredFormat: 'visual' }, studentCookie)
  ensure(onboarding.response.ok && onboarding.data.profile.onboardingComplete, 'Onboarding failed')
  const questions = await request('/diagnostic/questions', 'GET', null, studentCookie)
  ensure(questions.data.questions.length === 8 && !('answer' in questions.data.questions[0]), 'Diagnostic answers leaked')
  const answers = diagnosticQuestions.map(q => ({ id: q.id, choice: q.answer ?? 1, durationMs: 5000 }))
  answers[0].choice = 0
  const diagnostic = await request('/diagnostic', 'POST', { answers }, studentCookie)
  ensure(diagnostic.response.ok && diagnostic.data.profile.score === 6 && diagnostic.data.profile.knowledgeGaps.includes('math'), 'Diagnostic profile failed')
  const catalog = await request('/catalog', 'GET', null, studentCookie)
  ensure(catalog.data.subjects.length === 5, 'Expected five subjects')
  const lesson = catalog.data.subjects[0].units[0].lessons[0]
  ensure(lesson.subjectId === 'math' && lesson.exercise.answer === undefined, 'Catalog metadata or answer exposure failed')
  const source = getLesson(lesson.id)
  const wrong = await request('/attempt', 'POST', { lessonId: lesson.id, exerciseId: lesson.exercise.id, answer: 'wrong' }, studentCookie)
  ensure(wrong.response.ok && !wrong.data.correct && wrong.data.state.stats.xp === 0, 'Wrong attempt tracking failed')
  const repeated = await request('/attempt', 'POST', { lessonId: lesson.id, exerciseId: lesson.exercise.id, answer: 'wrong' }, studentCookie)
  ensure(repeated.response.ok && repeated.data.recommendedFormat === 'example' && repeated.data.state.profile.learningProfile.pace === 'gentle', 'Repeated-error adaptation failed')
  const correct = await request('/attempt', 'POST', { lessonId: lesson.id, exerciseId: lesson.exercise.id, answer: source.exercise.answer }, studentCookie)
  ensure(correct.response.ok && correct.data.correct && correct.data.state.stats.xp === 30 && correct.data.state.stats.streak === 1, 'Correct attempt or XP failed')
  const code = await request('/parent/code', 'POST', {}, studentCookie)
  ensure(code.response.ok && code.data.code, 'Parent code failed')
  const parent = await request('/auth/register', 'POST', { email: 'parent@example.test', password: 'SmokePassword123', role: 'parent', firstName: 'Ата-ана' })
  ensure(parent.response.status === 201 && parent.cookie, 'Parent registration failed')
  parentCookie = parent.cookie
  const before = await request('/parent/children', 'GET', null, parentCookie)
  ensure(before.data.children.length === 0, 'Parent saw student before linking')
  const link = await request('/parent/link', 'POST', { code: code.data.code }, parentCookie)
  ensure(link.response.ok, 'Parent link failed')
  const after = await request('/parent/children', 'GET', null, parentCookie)
  ensure(after.data.children.length === 1 && after.data.children[0].stats.xp === 30, 'Parent dashboard did not receive progress')
  const forbidden = await request('/state', 'GET', null, parentCookie)
  ensure(forbidden.response.status === 403, 'Parent accessed student-only state')
  const loggedOut = await request('/auth/logout', 'POST', {}, studentCookie)
  ensure(loggedOut.response.ok, 'Logout failed')
  const loggedIn = await request('/auth/login', 'POST', {email:'student@example.test',password:'SmokePassword123'})
  ensure(loggedIn.response.ok && loggedIn.cookie, 'Returning student login failed')
  const restored=await request('/state','GET',null,loggedIn.cookie)
  ensure(restored.data.stats.xp===30 && restored.data.progress.some(item=>item.status==='completed') && restored.data.profile.onboardingComplete, 'Cabinet lost progress after returning login')
  console.log('PASS: registration, onboarding, bilingual catalog, diagnostic, attempts, XP, streak, and parent permissions')
} finally {
  server.kill()
  await new Promise(resolve => server.once('exit', resolve))
  await rm(temp, { recursive: true, force: true })
}
