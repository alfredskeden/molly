# Molly: test strategy

The whole project is done when every phase's Definition of Done passes. Each phase has its own list in `phases/<name>/TEST_STRATEGY.md`. This file sets the method used everywhere and the checks that apply across all phases.

## Method: TDD by kind of work

Development follows a red → green → refactor loop. How it applies depends on what's being built:

| Kind of work | Where | Evidence |
| --- | --- | --- |
| Domain logic | `packages/core` | Unit tests written first (Vitest). Pure functions, so nothing to mock. Given / When / Then structure. Order: zero → one → many, then boundaries and errors |
| Technical: Baby Buddy client | `packages/api` | Integration tests written first against the real Baby Buddy test container (`e2e/docker-compose.yml`), pinned to a v2.11.x tag. These also act as the contract check against the real API |
| Technical: storage adapters, widget task handler | `apps/molly/src/storage`, `src/widget` | Web adapter: tests against jsdom `localStorage`. Native adapter and widget handler: logic kept thin, with decisions delegated to `core` (unit-tested). The rest is covered by the device checklist |
| Screens and flows | `apps/molly` | No TDD. Playwright end-to-end flows against the built web app plus the test container, as acceptance checks |
| Visuals, styling, widget look | `apps/molly` | No TDD. Manual review on web and on an Android device |

Tests must run fast: `core` in milliseconds, `api` in seconds against a running container. Playwright and the device checklist are the slow outer layer.

## Checks that hold in every phase

- `pnpm test` (all Vitest suites) and `pnpm typecheck` pass from the repo root with no skipped tests.
- `pnpm e2e` passes against the Docker web image, not only the dev server.
- The web bundle contains no `react-native-android-widget` code. A check fails the build if it appears.
- `packages/api` and `packages/core` import nothing from React, Expo or `apps/`. A lint rule or dependency check enforces this.
- No secrets in the repo: no API keys, keystore or signing passwords. Test keys come from the seeded container at runtime.
- The Android device checklist for that phase has been run on a real phone, and the result is recorded in the phase's retro.

## Phases

- **MVP**: [`phases/mvp/TEST_STRATEGY.md`](phases/mvp/TEST_STRATEGY.md).
- **Redesign**: [`phases/redesign/TEST_STRATEGY.md`](phases/redesign/TEST_STRATEGY.md).
- **Polish, multi-child, predictions**: each phase's Definition of Done is written when that phase is planned. For predictions it must at least cover:
  - suggestions from age defaults alone (no history);
  - suggestions refined by history;
  - edited defaults taking effect;
  - the "not medical advice" framing always visible where suggestions are shown.
