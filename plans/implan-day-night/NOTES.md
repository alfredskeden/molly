# Notes

## Decisions (planning, 2026-10-24)

- Inferred only; no explicit wake / bedtime actions.
- Scope: morning wake and bedtime, plus the nap flag. Calendar-midnight views stay.
- Morning: anchor learned from the child (median of 14 days, clamped 05:00–11:00, setting until 3 wakes); range and awake threshold by age, threshold capped at ⅔ of the child's usual first wake window.
- Bedtime: night if it starts ≥ usual bedtime − 90 min, or starts ≥ usual bedtime − 3 h and runs long (age-based). Card stays Today while a sleep runs until one holds.
- Nap flag decided at stop / log with the new rule; never patched.
- "Day starts / Day ends" setting stays, reworded as starting values.

## Evidence from the investigation (issue #14)

- Summer logs (another tracker, explicit taps, 66 days, ≈ 2¾ → 5 months): today's rule 39 right · 15 wrong · 12 none on morning wakes; proposed rule with a learned anchor ±3 h and ≥ 60 min, 57 · 8 · 1.
- Production Baby Buddy (Sep 20 – Oct 24, ≈ 4¾ → 6 months): night wakings before going back to sleep lasted 18–58 min; real first wake windows 64–111 min. The 60 min threshold sits in that gap. Old and new rule differ on 7 of 35 mornings, all the back-to-sleep shape.
- Learned-anchor drift: a −90 min / +3 h variant learning from its own picks crept 08:51 → 11:00+. Hence the separate anchor-free learning pass.

## Cleanup sweep (planning)

Each item is a sub-step in `MAIN.md`.

- `isNap` (`packages/core/src/nap.ts:6`): only used by `isNightSleep` (grep across apps, packages, scripts). Un-export in step 4.
- `WAKE_RANGE_MS` (`day-window.ts:7`): only the old `morningWake` and `fromWake`. Removed in step 3.
- `usualMorningAfter` (`needs.ts:258`) and `usualBedtime` (`next-sleep.ts:353`): two copies of "median of past wakes / bedtimes with a fallback to the setting". Replaced by `dayRhythm` in step 2, along with `NEEDS_TUNING.wakesNeeded` and `NEXT_SLEEP_TUNING.bedtimesNeeded`.
- `daysBefore` (`next-sleep.ts:326`) repeats `windowsOn` (`day-window.ts`). Refactor first (step 1).
- `replay.ts` and `scripts/replay-naps.ts --reflag` call `isNightSleep` / `morningWake` directly (steps 5–6).
- Docs naming the old rule as current: `CLAUDE.md:63`, `README.md:19`, `plans/implan-molly/NOTES.md:83,231`, child screen copy `app/(main)/child/[id]/index.tsx:197` (steps 8–9).

## Open

- None yet. The final tuning numbers and replay scores go here in step 5.
