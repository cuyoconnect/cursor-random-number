/**
 * Simula N jugadores (bots) en una sala y completa una ronda para probar gráficas.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/simulate-round.mjs DS8Z5P 80
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const PLAYER_COLORS = [
  '#f7f7f4',
  '#d9d5cf',
  '#b6b9be',
  '#9ca3af',
  '#8a8780',
  '#6b6560',
  '#52524e',
  '#3d3d3a',
]

function pickColor(index) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length]
}

function findWinner(choices) {
  const freq = new Map()
  for (const c of choices) {
    freq.set(c.number, (freq.get(c.number) ?? 0) + 1)
  }
  const uniqueChoices = choices.filter((c) => freq.get(c.number) === 1)
  if (uniqueChoices.length === 0) {
    return { winnerId: null, winningNumber: null }
  }
  const winner = uniqueChoices.reduce((min, c) =>
    c.number < min.number ? c : min,
  )
  return { winnerId: winner.playerId, winningNumber: winner.number }
}

/** Distribución realista: muchos eligen bajo, con colisiones frecuentes. */
function simulateChoice(minNum, maxNum) {
  const roll = Math.random()
  const span = maxNum - minNum + 1

  if (roll < 0.45) {
    const cap = Math.min(20, span)
    return minNum + Math.floor(Math.random() * cap)
  }
  if (roll < 0.7) {
    const start = minNum + Math.floor(span * 0.15)
    const end = minNum + Math.floor(span * 0.45)
    return start + Math.floor(Math.random() * Math.max(1, end - start + 1))
  }
  if (roll < 0.85) {
    return minNum + Math.floor(Math.random() * Math.min(5, span))
  }
  return minNum + Math.floor(Math.random() * span)
}

async function main() {
  const roomCode = (process.argv[2] ?? 'DS8Z5P').toUpperCase()
  const targetPlayers = Number(process.argv[3] ?? 80)

  const url =
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    'https://eubhllsyomhnoaotbuli.supabase.co'
  const key =
    process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY

  if (!key) {
    console.error(
      'Falta SUPABASE_ANON_KEY o VITE_SUPABASE_ANON_KEY en el entorno.',
    )
    process.exit(1)
  }

  if (!Number.isFinite(targetPlayers) || targetPlayers < 2) {
    console.error('Cantidad de jugadores inválida:', process.argv[3])
    process.exit(1)
  }

  const supabase = createClient(url, key)

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, host_id, min_num, max_num, total_rounds')
    .eq('code', roomCode)
    .maybeSingle()

  if (roomError || !room) {
    console.error('Sala no encontrada:', roomError?.message ?? roomCode)
    process.exit(1)
  }

  console.log(`Sala ${roomCode} — objetivo: ${targetPlayers} jugadores`)

  const { data: rounds } = await supabase
    .from('rounds')
    .select('id')
    .eq('room_id', room.id)
  const roundIds = (rounds ?? []).map((r) => r.id)

  if (roundIds.length > 0) {
    await supabase.from('choices').delete().in('round_id', roundIds)
    await supabase.from('rounds').delete().eq('room_id', room.id)
  }

  await supabase
    .from('rooms')
    .update({ phase: 'lobby', current_round: 0, demo_mode: true })
    .eq('id', room.id)

  await supabase
    .from('players')
    .delete()
    .eq('room_id', room.id)
    .neq('id', room.host_id)

  const { count: currentCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id)

  const botsToAdd = Math.max(0, targetPlayers - (currentCount ?? 0))
  console.log(`Jugadores actuales: ${currentCount ?? 0}, bots a agregar: ${botsToAdd}`)

  const batchSize = 50

  if (botsToAdd > 0) {
    const bots = Array.from({ length: botsToAdd }, (_, i) => ({
      id: randomUUID(),
      room_id: room.id,
      nickname: `Bot ${String(i + 1).padStart(2, '0')}`,
      color: pickColor((currentCount ?? 0) + i),
      is_bot: true,
    }))

    for (let i = 0; i < bots.length; i += batchSize) {
      const batch = bots.slice(i, i + batchSize)
      const { error } = await supabase.from('players').insert(batch)
      if (error) {
        console.error('Error insertando bots:', error.message)
        process.exit(1)
      }
    }
  }

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, nickname, is_bot')
    .eq('room_id', room.id)
    .order('joined_at')

  if (playersError || !players?.length) {
    console.error('No se pudieron cargar jugadores')
    process.exit(1)
  }

  console.log(`Total jugadores: ${players.length}`)

  const roundNumber = 1
  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .insert({
      room_id: room.id,
      round_number: roundNumber,
      status: 'selecting',
      deadline: new Date(Date.now() + 60_000).toISOString(),
    })
    .select('id')
    .single()

  if (roundError || !round) {
    console.error('Error creando ronda:', roundError?.message)
    process.exit(1)
  }

  await supabase
    .from('rooms')
    .update({ phase: 'selecting', current_round: roundNumber })
    .eq('id', room.id)

  const choiceRows = players.map((p) => ({
    round_id: round.id,
    player_id: p.id,
    number: simulateChoice(room.min_num, room.max_num),
  }))

  for (let i = 0; i < choiceRows.length; i += batchSize) {
    const batch = choiceRows.slice(i, i + batchSize)
    const { error } = await supabase.from('choices').insert(batch)
    if (error) {
      console.error('Error insertando elecciones:', error.message)
      process.exit(1)
    }
  }

  const { winnerId } = findWinner(
    choiceRows.map((c) => ({ playerId: c.player_id, number: c.number })),
  )

  const freq = new Map()
  for (const c of choiceRows) {
    freq.set(c.number, (freq.get(c.number) ?? 0) + 1)
  }
  const duplicates = [...freq.entries()].filter(([, n]) => n > 1).length
  const uniques = [...freq.values()].filter((n) => n === 1).length

  await supabase
    .from('rounds')
    .update({ status: 'completed', winner_id: winnerId })
    .eq('id', round.id)

  const nextPhase =
    roundNumber >= room.total_rounds ? 'session_stats' : 'round_summary'

  await supabase.from('rooms').update({ phase: nextPhase }).eq('id', room.id)

  const winnerName = players.find((p) => p.id === winnerId)?.nickname ?? '—'
  console.log('')
  console.log('Simulación lista.')
  console.log(`  Fase: ${nextPhase}`)
  console.log(`  Ronda: ${roundNumber}/${room.total_rounds}`)
  console.log(`  Rango: ${room.min_num}-${room.max_num}`)
  console.log(`  Números únicos: ${uniques}, colisiones en ${duplicates} valores`)
  console.log(`  Ganador: ${winnerName} (${winnerId ?? 'empate'})`)
  console.log('')
  console.log(`Abrí http://localhost:5173/room/${roomCode} (refrescá si hace falta)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
