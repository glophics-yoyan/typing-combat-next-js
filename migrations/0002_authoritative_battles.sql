-- Phase 2 authoritative battle state and guest identity migration.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS difficulty INTEGER NOT NULL DEFAULT 2;

ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'completed',
    ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id),
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS finished_reason VARCHAR(32),
    ADD COLUMN IF NOT EXISTS protocol_version INTEGER NOT NULL DEFAULT 1;

UPDATE matches
SET started_at = played_at - (COALESCE(duration_ms, 0) * INTERVAL '1 millisecond'),
    finished_at = played_at,
    finished_reason = COALESCE(finished_reason, 'legacy_result')
WHERE started_at IS NULL OR finished_at IS NULL;

CREATE TABLE IF NOT EXISTS match_participants (
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    outcome VARCHAR(16) NOT NULL,
    wpm REAL NOT NULL DEFAULT 0,
    accuracy REAL NOT NULL DEFAULT 1,
    total_keystrokes INTEGER NOT NULL DEFAULT 0,
    correct_keystrokes INTEGER NOT NULL DEFAULT 0,
    final_position INTEGER NOT NULL DEFAULT 0,
    final_hp REAL NOT NULL DEFAULT 100,
    PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS live_match_states (
    match_id UUID PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
    revision BIGINT NOT NULL DEFAULT 0,
    state_version INTEGER NOT NULL DEFAULT 1,
    state JSONB NOT NULL,
    checkpointed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_one_live_room
    ON matches(room_id)
    WHERE status IN ('countdown', 'active', 'paused');
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_match_participants_user ON match_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_live_match_states_checkpoint ON live_match_states(checkpointed_at);
