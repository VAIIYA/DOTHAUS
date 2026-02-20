Original prompt: Look at the project files and see that we are building a game like Agar.io. Look for improvements you should make and go for it and make those improvements.

- Reviewed core files: src/components/game/GameCanvas.tsx, src/lib/game/Engine.ts, server.js, src/app/play/page.tsx.
- Planned improvements: fix split/eject direction NaN when target overlaps fragment; correct lobby elimination/respawn behavior; improve fragment merge safety; fix winner/pot UI logic in play page.

- Implemented server-side robustness in `server.js`:
  - Added safe direction vector helper to prevent NaN movement on split/eject when cursor overlaps a fragment.
  - Validated/clamped incoming `input` coordinates before applying targets.
  - Added reusable spawn fragment generator with `splitTime` for correct post-split merge behavior.
  - Fixed lobby elimination flow to actually respawn the same connected player after delay.
  - Ensured split and virus explosion fragments set `splitTime` so merge cooldown works.
- Updated play overlay in `src/app/play/page.tsx`:
  - Pot and payout now use room-specific entry price instead of hardcoded `0.1`.
  - Winner headline now compares winner name against local player name via `myPlayerId`.
- Added automation/debug hooks:
  - `GameEngine.renderGameToText()` and `GameEngine.advanceTime(ms)`.
  - Exposed `window.render_game_to_text` and `window.advanceTime` in `GameCanvas` with cleanup on unmount.
- Validation attempt results:
  - `npm run lint` failed because `eslint` binary is unavailable (dependencies not installed).
  - `npm run dev` failed due missing module `next` (dependencies not installed), so Playwright game-run validation is currently blocked.
- Suggested next step when dependencies are available: run `npm install`, then `npm run lint`, `npm run dev`, and the Playwright client loop against `http://localhost:3000/play?room=0`.
