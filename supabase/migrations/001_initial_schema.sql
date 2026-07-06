-- Único game schema

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_id UUID,
  phase TEXT NOT NULL DEFAULT 'lobby'
    CHECK (phase IN ('lobby', 'selecting', 'revealing', 'round_summary', 'session_stats')),
  total_rounds INT NOT NULL DEFAULT 5 CHECK (total_rounds BETWEEN 1 AND 50),
  current_round INT NOT NULL DEFAULT 0,
  min_num INT NOT NULL DEFAULT 1,
  max_num INT NOT NULL DEFAULT 100 CHECK (max_num > min_num),
  demo_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  color TEXT NOT NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rooms
  ADD CONSTRAINT rooms_host_id_fkey
  FOREIGN KEY (host_id) REFERENCES players(id) ON DELETE SET NULL;

CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'selecting'
    CHECK (status IN ('selecting', 'revealing', 'completed')),
  winner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  deadline TIMESTAMPTZ,
  UNIQUE (room_id, round_number)
);

CREATE TABLE choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  number INT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (round_id, player_id)
);

CREATE INDEX idx_players_room ON players(room_id);
CREATE INDEX idx_rounds_room ON rounds(room_id);
CREATE INDEX idx_choices_round ON choices(round_id);
CREATE INDEX idx_rooms_code ON rooms(code);

-- Sanitized game view (hides other players' numbers during selecting)
CREATE OR REPLACE FUNCTION fetch_game_view(p_room_code TEXT, p_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room rooms%ROWTYPE;
  v_player players%ROWTYPE;
  v_current_round rounds%ROWTYPE;
  v_can_reveal BOOLEAN;
  v_players JSONB;
  v_choices JSONB;
  v_history JSONB;
BEGIN
  SELECT * INTO v_room FROM rooms WHERE UPPER(code) = UPPER(p_room_code);
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_player FROM players WHERE id = p_player_id AND room_id = v_room.id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_room.current_round > 0 THEN
    SELECT * INTO v_current_round
    FROM rounds
    WHERE room_id = v_room.id AND round_number = v_room.current_round;
  END IF;

  v_can_reveal := v_room.phase IN ('revealing', 'round_summary', 'session_stats')
    OR (v_current_round.id IS NOT NULL AND v_current_round.status <> 'selecting');

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'roomId', p.room_id,
      'nickname', p.nickname,
      'color', p.color,
      'isBot', p.is_bot
    ) ORDER BY p.joined_at
  ), '[]'::jsonb)
  INTO v_players
  FROM players p
  WHERE p.room_id = v_room.id;

  IF v_current_round.id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'playerId', p.id,
        'hasSubmitted', (c.id IS NOT NULL),
        'number', CASE
          WHEN c.id IS NULL THEN NULL
          WHEN v_can_reveal OR p.id = p_player_id THEN c.number
          ELSE NULL
        END
      )
    ), '[]'::jsonb)
    INTO v_choices
    FROM players p
    LEFT JOIN choices c ON c.player_id = p.id AND c.round_id = v_current_round.id
    WHERE p.room_id = v_room.id;
  ELSE
    v_choices := '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'roundId', r.id,
      'roundNumber', r.round_number,
      'winnerId', r.winner_id,
      'choices', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'roundId', c.round_id,
            'playerId', c.player_id,
            'number', c.number,
            'submittedAt', EXTRACT(EPOCH FROM c.submitted_at) * 1000
          )
        ), '[]'::jsonb)
        FROM choices c
        WHERE c.round_id = r.id
      )
    ) ORDER BY r.round_number
  ), '[]'::jsonb)
  INTO v_history
  FROM rounds r
  WHERE r.room_id = v_room.id AND r.status = 'completed';

  RETURN jsonb_build_object(
    'room', jsonb_build_object(
      'id', v_room.id,
      'code', v_room.code,
      'hostId', v_room.host_id,
      'phase', v_room.phase,
      'totalRounds', v_room.total_rounds,
      'currentRound', v_room.current_round,
      'minNum', v_room.min_num,
      'maxNum', v_room.max_num,
      'demoMode', v_room.demo_mode,
      'createdAt', EXTRACT(EPOCH FROM v_room.created_at) * 1000
    ),
    'players', v_players,
    'currentRound', CASE WHEN v_current_round.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_current_round.id,
      'roomId', v_current_round.room_id,
      'roundNumber', v_current_round.round_number,
      'status', v_current_round.status,
      'winnerId', v_current_round.winner_id,
      'deadline', CASE WHEN v_current_round.deadline IS NULL THEN NULL
        ELSE EXTRACT(EPOCH FROM v_current_round.deadline) * 1000 END
    ) END,
    'choices', v_choices,
    'history', v_history,
    'myPlayerId', p_player_id,
    'isHost', v_room.host_id = p_player_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION fetch_game_view(TEXT, UUID) TO anon, authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE choices;

-- RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE choices ENABLE ROW LEVEL SECURITY;

CREATE POLICY rooms_select ON rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY rooms_insert ON rooms FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY rooms_update ON rooms FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY players_select ON players FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY players_insert ON players FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY players_delete ON players FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY rounds_select ON rounds FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY rounds_insert ON rounds FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY rounds_update ON rounds FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY rounds_delete ON rounds FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY choices_select ON choices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY choices_insert ON choices FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY choices_update ON choices FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY choices_delete ON choices FOR DELETE TO anon, authenticated USING (true);
