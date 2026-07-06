# Único

Juego multijugador web: elegí el **menor número que nadie más elija**. Al final de la sesión, estadísticas y análisis de estrategias de cada jugador.

## Requisitos

- Node.js 18+
- npm

## Desarrollo local

```bash
npm install
npm run dev
```

Abrí [http://localhost:5173](http://localhost:5173)

## Cómo jugar

### Modo demo (solo)

1. Crear sala con **Modo demo** activado
2. Empezar partida — los bots juegan automáticamente
3. Al terminar las rondas, revisá el panel de estadísticas

### Multijugador local (2+ pestañas)

1. Pestaña 1: Crear sala → copiá el código
2. Pestaña 2: Unirse con el código
3. Pestaña 1 (anfitrión): Empezar partida
4. Cada jugador elige su número en secreto
5. Al final: estadísticas y estrategias detectadas

> **Nota:** Con Supabase configurado, el multijugador funciona entre dispositivos distintos en tiempo real. Sin variables de entorno, usa backend local (`localStorage` + `BroadcastChannel`).

## Supabase

Proyecto: `unico-game` (`eubhllsyomhnoaotbuli`, región sa-east-1)

Variables en `.env.local`:

```
VITE_SUPABASE_URL=https://eubhllsyomhnoaotbuli.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key del dashboard>
```

## Deploy en Vercel

```bash
npm run build
npx vercel --prod
```

O conectá el repo en [vercel.com](https://vercel.com). El archivo `vercel.json` ya incluye rewrites para SPA.

**Producción:** [https://unico-game-three.vercel.app](https://unico-game-three.vercel.app)

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- Framer Motion
- Backend local (LocalRoomService)

## Próximo paso: Supabase

Integrado. Para desarrollo local, copiá `.env.example` a `.env.local` con las credenciales del [dashboard de Supabase](https://supabase.com/dashboard/project/eubhllsyomhnoaotbuli/settings/api).
