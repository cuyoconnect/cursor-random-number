-- Expire rooms after 1 hour so CURSOR## codes can be reused.

CREATE OR REPLACE FUNCTION expire_old_rooms()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM rooms
  WHERE created_at < now() - interval '1 hour';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION expire_old_rooms() TO anon, authenticated;

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
  PERFORM expire_old_rooms();

  SELECT * INTO v_room FROM rooms WHERE UPPER(code) = UPPER(p_room_code);
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_room.created_at < now() - interval '1 hour' THEN
    DELETE FROM rooms WHERE id = v_room.id;
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
