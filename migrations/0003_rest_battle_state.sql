-- Durable authoritative state for the serverless REST battle transport.

CREATE TABLE IF NOT EXISTS room_battle_states (
    room_id UUID PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
    match_id UUID UNIQUE REFERENCES matches(id) ON DELETE SET NULL,
    revision BIGINT NOT NULL DEFAULT 0,
    state_version INTEGER NOT NULL DEFAULT 2,
    state JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_battle_states_updated
    ON room_battle_states(updated_at);
