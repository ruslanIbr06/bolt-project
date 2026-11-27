# Smart Campus Room Availability Checker

A frontend-only demo that checks whether a time slot is free in a single fictional seminar room. There is no backend, database, login, or booking creation — the app only reports an availability decision against fixed, fictional booking data.

## Scope

- **One room:** Seminar Room SC-204 (2nd floor, Science Building, 32 seats).
- **Fixed current time:** 2026-01-05 09:00. "Past" is measured against this time, not the real wall clock.
- **Fictional bookings** for 2026-01-05, stored as read-only fixtures:
  - 10:00–11:00 — Linear Algebra Lecture
  - 13:00–14:00 — Study Group
- Blocked-room state is ephemeral UI state, not persisted.

## Optional "Explain availability"

A mock, non-authoritative explanation feature augments the deterministic checker. It never changes availability decisions or booking data.

- A mock LLM adapter (`src/lib/explainAvailability.ts`) takes `{roomLabel, start, end, isAvailable, reasonCode}` and returns `{explanation}` (max 2 sentences, using only those facts).
- Input is validated (reject empty, malformed, or over-200-character values); output is validated (non-empty string, max 300 characters).
- On any error, 3s timeout, or invalid output, a deterministic fallback message built from the reason code is shown.
- The UI shows the explanation in a separate box labeled "Generated explanation (not the booking status)", away from the green/red status.
- No login, database, real personal data, or client-side API keys. No external calls or new dependencies.

## Input model

The form takes a **start time** (HH:MM) plus a **duration in minutes**. The end time is computed by the checker as `start + duration`; it is never entered directly.

- Duration must be an integer between 1 and 120 inclusive.
- The fixed current time is 2026-01-05 09:00; "past" is measured against that, not the real wall clock.

## Acceptance rules (AC1–AC6)

The availability logic in `src/lib/checkAvailability.ts` must preserve these:

- **AC1:** Start must be at or after the fixed current time (09:00).
- **AC2:** Duration must be greater than 0 and at most 120 minutes.
- **AC3:** Reject overlaps with existing bookings. Slots that only touch a booking at an endpoint (e.g. ending exactly at 10:00, or starting exactly at 11:00) are allowed.
- **AC4:** Reject the request when the room is marked blocked.
- **AC5:** Return a clear decision (green available / red rejected) with a non-empty message, and never mutate the booking fixtures.
- **AC6:** Provide clear invalid-input feedback for a malformed start time or an out-of-range duration, responsive on both desktop and mobile.

## Project structure

```
src/
  fixtures/room.ts                # Fixed current time, room, and read-only bookings
  lib/checkAvailability.ts        # Pure availability rules (no UI, no I/O), emits reason codes
  lib/checkAvailability.test.ts   # Vitest regression tests for AC1–AC6
  lib/explainAvailability.ts      # Mock LLM explanation adapter (validated, 3s timeout, fallback)
  lib/explainAvailability.test.ts # Vitest unit tests for the mock adapter
  App.tsx                         # UI: inputs, blocked checkbox, result, explain box, bookings list
  main.tsx                        # React entry point
  index.css                       # Tailwind CSS
```

## Commands

All commands below are defined in `package.json`.

| Command | Script | Purpose |
| --- | --- | --- |
| `npm install` | — | Install dependencies |
| `npm run dev` | `vite` | Start the dev server |
| `npm test` | `vitest run` | Run the test suite once |
| `npm run lint` | `eslint .` | Lint the project |
| `npm run build` | `vite build` | Type-check and build for production |

`npm run typecheck` (`tsc --noEmit -p tsconfig.app.json`) and `npm run preview` (`vite preview`) also exist in `package.json` for local type-checking and previewing the production build.
