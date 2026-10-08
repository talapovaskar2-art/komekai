import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const databasePath = resolve(process.env.KOMEKAI_DB_PATH || 'data/komekai.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })
export const db = new DatabaseSync(databasePath)
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
db.exec(readFileSync(resolve('server/migrations/001_initial.sql'), 'utf8'))

export function studentSnapshot(userId) {
  const profile = db.prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(userId)
  const preferences = db.prepare('SELECT * FROM preferences WHERE user_id = ?').get(userId)
  const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId)
  const progress = db.prepare('SELECT * FROM lesson_progress WHERE user_id = ?').all(userId)
  const diagnostic = db.prepare('SELECT result_json, created_at FROM diagnostics WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId)
  const attempts = db.prepare('SELECT lesson_id, exercise_id, correct, error_pattern, created_at FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 80').all(userId)
  const achievements = db.prepare('SELECT achievement_id, earned_at FROM achievements WHERE user_id = ?').all(userId)
  return {
    profile: profile && { ...profile, conditions: JSON.parse(profile.conditions_json), difficulties: JSON.parse(profile.difficulties_json), learningProfile: JSON.parse(profile.learning_profile_json), onboardingComplete: Boolean(profile.onboarding_complete) },
    preferences: preferences && { ...preferences, reduced_motion: Boolean(preferences.reduced_motion), focus_mode: Boolean(preferences.focus_mode), captions: Boolean(preferences.captions) },
    stats,
    progress,
    diagnostic: diagnostic && { ...JSON.parse(diagnostic.result_json), created_at: diagnostic.created_at },
    attempts,
    achievements
  }
}
