-- TypeRacer Combat initial schema for Neon/Postgres.
-- Safe to run once on a new database, or repeatedly during local setup.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(32) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(6) UNIQUE NOT NULL,
    host_id UUID REFERENCES users(id),
    status VARCHAR(16) NOT NULL DEFAULT 'waiting',
    quote_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    signaling_offer JSONB,
    signaling_answer JSONB,
    signaling_ice JSONB[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS room_players (
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hp INTEGER NOT NULL DEFAULT 100,
    wpm REAL NOT NULL DEFAULT 0,
    accuracy REAL NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    is_ready BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    author VARCHAR(128),
    difficulty INTEGER NOT NULL DEFAULT 1,
    char_count INTEGER GENERATED ALWAYS AS (length(text)) STORED
);

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id),
    winner_id UUID REFERENCES users(id),
    loser_id UUID REFERENCES users(id),
    winner_wpm REAL,
    loser_wpm REAL,
    duration_ms INTEGER,
    played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(winner_id, loser_id);

INSERT INTO quotes (text, author, difficulty)
SELECT seed.text, seed.author, seed.difficulty
FROM (
    VALUES
        ('The only way to do great work is to love what you do.', 'Steve Jobs', 1),
        ('In the middle of difficulty lies opportunity.', 'Albert Einstein', 1),
        ('Code is like humor. When you have to explain it, it''s bad.', 'Cory House', 1),
        ('First, solve the problem. Then, write the code.', 'John Johnson', 1),
        ('Experience is the name everyone gives to their mistakes.', 'Oscar Wilde', 1),
        ('The best error message is the one that never shows up.', 'Thomas Fuchs', 2),
        ('Simplicity is the soul of efficiency.', 'Austin Freeman', 1),
        ('Talk is cheap. Show me the code.', 'Linus Torvalds', 1),
        ('Programs must be written for people to read, and only incidentally for machines to execute.', 'Harold Abelson', 2),
        ('Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', 'Martin Fowler', 2)
) AS seed(text, author, difficulty)
WHERE NOT EXISTS (SELECT 1 FROM quotes);
