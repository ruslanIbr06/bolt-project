# AGENTS.md

## Project
Smart Campus room availability checker. One room, fictional bookings, fixed current time.
Output is an availability decision only. An optional "Explain availability" button produces a
mock, non-authoritative explanation; the deterministic checker always governs status.

## Structure
- src/lib/checkAvailability.ts: pure booking rules (no UI, no I/O), emits reason codes
- src/lib/explainAvailability.ts: mock LLM adapter (labeled, validated, 3s timeout, fallback)
- src/ UI components: display and input only
- fixtures file: fictional bookings (read-only)
- tests: regression tests for AC1-AC6 plus explainAvailability unit tests

## Input model
- Form takes start time (HH:MM) + duration in minutes; end = start + duration (computed by the checker, never entered).
- duration must be an integer between 1 and 120 inclusive.

## Accepted rules (must be preserved)
- AC1: start must be at or after the fixed current time (09:00); no end-time input
- AC2: duration must be > 0 and <= 120 minutes
- AC3: reject overlaps; bookings touching only at endpoints are allowed
- AC4: reject the request when the room is marked blocked
- AC5: clear decision (green/red) with a message; booking fixtures never mutated
- AC6: clear invalid-input feedback (bad time or out-of-range duration)

## Commands
- Install: npm install
- Dev: npm run dev
- Test: npm test (vitest run)
- Build: npm run build
- Lint: npm run lint
- Typecheck: npm run typecheck

## Forbidden scope changes
- No backend, database, login or booking creation
- No secrets, env vars, API keys, or external deployments
- No new features or new dependencies
- Max 2 justified patterns; prefer pure functions and minimal changes
- Do not weaken or delete existing test assertions
- Do not change UI appearance or text

## Verification
Run `npm test` and `npm run build` (plus lint/typecheck when touching code) before proposing acceptance; all must pass. Add focused regression tests and report changed files, rationale, and test output.