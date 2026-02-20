# DOTHAUS

Multiplayer Agar-style arena game built with Next.js, Socket.IO, Solana wallet auth, and Turso/Drizzle persistence.

## Stack

- Next.js App Router + React + TypeScript
- Custom Node server (`server.js`) for Socket.IO game loop
- Drizzle ORM + Turso (`@libsql/client`)
- Solana wallet adapter for sign-in and gameplay identity

## Prerequisites

- Node.js 20+
- npm 10+
- Turso database + auth token

## Environment

Create `.env.local` with:

```bash
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
INTERNAL_API_SECRET=your-internal-secret
HOST=0.0.0.0
PORT=3000
```

## Install

```bash
npm install
```

## Database

Apply migrations in `drizzle/` to provision `users` and `auth_nonces`.

```bash
npx drizzle-kit migrate
```

## Run

```bash
npm run dev
```

App and game server run on the same host/port.

## Quality checks

```bash
npm run lint
npm run test
npm run build
```

## Architecture

- `server.js`: room lifecycle, game tick, socket events, live `/api/rooms` summaries
- `src/app/api/user/nonce`: issues short-lived DB-backed nonces
- `src/app/api/user`: verifies signed SIWS-style message and consumes nonce
- `src/lib/services/user-service.ts`: atomic leaderboard stat increments
- `src/components/game/*`: client renderer and real-time gameplay UI

## Security model (wallet auth)

- Client requests nonce from `/api/user/nonce`
- Server stores nonce with expiry in `auth_nonces`
- Client signs canonical message including domain + nonce + expiry
- Server verifies signature and marks nonce as used (one-time)

## Notes

- Room configuration and fee model are centralized in `src/config/game-config.json`.
- House fee is configurable via `houseFeeRate` in the shared config.
