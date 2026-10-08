PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  google_sub TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('student','parent')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER,
  grade INTEGER,
  conditions_json TEXT NOT NULL DEFAULT '[]',
  difficulties_json TEXT NOT NULL DEFAULT '[]',
  learning_profile_json TEXT NOT NULL DEFAULT '{}',
  onboarding_complete INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  locale TEXT NOT NULL DEFAULT 'ru',
  text_scale TEXT NOT NULL DEFAULT 'normal',
  line_spacing TEXT NOT NULL DEFAULT 'normal',
  contrast TEXT NOT NULL DEFAULT 'normal',
  reduced_motion INTEGER NOT NULL DEFAULT 0,
  focus_mode INTEGER NOT NULL DEFAULT 0,
  captions INTEGER NOT NULL DEFAULT 1,
  preferred_format TEXT NOT NULL DEFAULT 'step'
);
CREATE TABLE IF NOT EXISTS diagnostics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'current',
  mastery REAL NOT NULL DEFAULT 0,
  best_score REAL NOT NULL DEFAULT 0,
  completed_at TEXT,
  PRIMARY KEY(user_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  answer_json TEXT NOT NULL,
  correct INTEGER NOT NULL,
  error_pattern TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS attempts_user_date ON attempts(user_id, created_at);
CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date TEXT,
  weekly_goal INTEGER NOT NULL DEFAULT 4
);
CREATE TABLE IF NOT EXISTS achievements (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  earned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, achievement_id)
);
CREATE TABLE IF NOT EXISTS parent_links (
  parent_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(parent_id, student_id)
);
CREATE TABLE IF NOT EXISTS link_codes (
  code_hash TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tutor_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  lesson_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
