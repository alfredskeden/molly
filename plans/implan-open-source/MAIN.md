# Open-source Molly

## Outcome

`github.com/alfredskeden/molly` is public, under MIT, as **one fresh initial commit**. A Baby Buddy family who finds it can read the README, build the web image or the Android app with their own keys, and run it. Nothing in the tree identifies the family behind it beyond the owner's name (the GitHub account and the Android id `se.skedeback.molly`, both accepted): no child's name or birth date, no real sleep data, no home network, devices, password manager, key locations, private design project, or personal workflow rules.

The full private history (160 commits) is kept locally and never pushed publicly.

## Why this shape

- **One fresh commit, not a history rewrite.** Old commits hold a personal email address on every commit, committed Playwright traces (screenshots and network logs) and every past version of the plan notes. Scrubbing all blobs with `git filter-repo` is easy to get wrong; a single snapshot commit leaks nothing from the past. The cost (public history starts at day one) is accepted.
- **Flip the existing repo.** It has never been public, so no forks or caches exist. Force-pushing one commit and deleting every other ref leaves nothing old reachable from the public repo. Before doing it, check that GitHub has no open PRs, releases or Actions artefacts that would keep old objects reachable (see step 6).
- **Plans stay, scrubbed.** They are the honest record of how the app was built and tell contributors why things are the way they are. They go through the same scrub as everything else.
- **Agent files stay, rewritten.** `CLAUDE.md` is useful to anyone working on the repo with an agent; it loses the progress diary and personal rules, and keeps architecture, commands and conventions.

## Boundaries

In: the tree's content, docs, license and attribution, the publish itself, the repo settings on GitHub.

Out:
- Renaming the Android id or the Kotlin package.
- CI, release APKs on GitHub Releases, a hosted demo, issue/PR templates, a code of conduct. (Any of these can be its own plan later.)
- Changing app behaviour. The only code changes allowed are comments, test fixtures (addresses, names) and metadata (`license` fields).
- Finishing the open "current work" plans. Their open items stay listed as open.

## The scrub rule

Remove or neutralise, everywhere in the tree (code, comments, tests, docs, plans, HTML artefacts, SVG metadata):

| Kind | Replace with |
| --- | --- |
| A real child (name, birth date) | A made-up example ("Born 3 March 2026"), or drop the line |
| Real logs (counts, date ranges, replay numbers) | "Replayed on one family's real logs (not committed)": keep the conclusions |
| Home network addresses | `192.0.2.10` (documentation range) or `baby.example.com` |
| Physical devices and check dates | "a physical Android 16+ phone"; emulator setup can stay generic |
| Personal tools and key paths | "a password manager", "a path outside the repo", `O=Example` |
| Personal sign-offs and quotes | Plain status: "Done", "Signed off on a device", "Wording not yet reviewed" |
| Links to the private design project | Nothing; design file names may stay as "the (private) design source" |
| Personal workflow rules | Drop, or keep only as a neutral project convention ("tests first in `packages/core`") |

Generic first names in tests (Otto, Ella, Mia) are made up and stay.

Grep every kind, and read each plan file once end to end.

## Steps

Each step is one commit on the private `main` (the publish squashes them). Mark `[x]` when done.

- [x] **1. Back up the private history.** `git bundle create ~/molly-private-history.bundle --all` (outside the repo), verify it (`git bundle verify`), and tag the current head `private/before-open-source` locally. Push nothing. Tell the developer where the bundle is.

- [x] **2. Scrub code, tests and assets.**
  - `packages/core/src/login-qr.test.ts`: LAN address → a generic one.
  - Comments naming the design project or a person in `apps/molly/src/theme/` (`copy.ts`, `ornaments.ts`, `sim-words.ts`, `themes.ts`, `tokens.ts`) and anywhere else `git grep -n -i -E 'claude\.ai|DesignSync|developer'` finds them in `apps/` / `packages/` / `scripts/` / `e2e/`.
  - `apps/molly/assets/brand/mark.svg`: strip editor metadata and design references.
  - `docs/android-build.md`: keystore DN → `O=Example`.
  - Run `pnpm check` (behaviour must not change).

- [x] **3. Scrub the plans.** Every file under `plans/` against the scrub rule, including `plans/implan-molly/artifacts/*.html`, `plans/implan-molly/spikes/`, `plans/implan-ring-redesign/design/Molly Ring v4.dc.html` (or drop that file if it can't be cleaned; it is a design export) and `plans/implan-development/research/`. Keep facts, decisions and open items; rewrite the personal bits rather than deleting whole notes. Rewrite stale "current" wording only where it now lies.

- [x] **4. Rewrite the agent and contributor files.**
  - Root `CLAUDE.md`: keep Commands, Architecture, Testing method. Replace "Where things stand" (the progress diary) with a pointer to a new `plans/README.md`: one line per plan, status `done` / `open items left`, no personal details. Drop the design-project line and the developer-only rules.
  - `apps/molly/CLAUDE.md` / `AGENTS.md`, `apps/molly/.claude/settings.json`, `apps/molly/.vscode/`: read, scrub if needed, keep.
  - Add a short `CONTRIBUTING.md`: setup, `pnpm check`, the test Baby Buddy (`pnpm bb:up && pnpm bb:seed`), tests first in `packages/core` with Given / When / Then, Playwright for screens, the platform-suffix and `'use no memo'` gotchas (pointer to `CLAUDE.md`), no support promise.
  - Add `SECURITY.md`: how to report privately (GitHub private vulnerability reporting), what the app stores (each device's Baby Buddy address and key, SecureStore on Android, `localStorage` on web) and that it has no server.

- [x] **5. Public docs, license and attribution.**
  - `LICENSE`: MIT, year 2026, the owner's name as the owner wants it.
  - `"license": "MIT"` in the four `package.json` files (keep `private: true`, nothing is published to npm).
  - `THIRD_PARTY.md` (or `NOTICE`): WHO Child Growth Standards data in `packages/core/src/who-weight.ts` (CC BY-NC-SA 3.0 IGO, not covered by MIT, with the WHO citation); the development guide's sources (pointer to `packages/core/src/development/sources.ts`); fonts (SIL OFL via `@expo-google-fonts/*`); Baby Buddy is a separate project (BSD-2-Clause), Molly is not affiliated with it.
  - `README.md` rewrite for a self-hoster arriving cold: what Molly is (one paragraph + 2–4 screenshots taken on the emulator / web with the seeded test data, never real data), features, how it works (no backend, talks to your Baby Buddy), quick start (web image, Android build), requirements (move the macOS-only `~/.zprofile` block into `docs/android-build.md` and say Linux works with the equivalent), a "not medical advice" note for the development guide and sleep predictions, project status (personal project, works for one family, no support promise), license and links to `CONTRIBUTING.md`, `THIRD_PARTY.md`, `plans/README.md`. Drop the stale "polish is the one in progress" line.
  - `docs/setup.md`, `docs/android-build.md`: read as a stranger. Building needs **your own** upload keystore; say what the Android id means for them (the same id as the original, so they can't install next to a build signed with someone else's key) and how to change it if they want. `pnpm web:image:pi`: describe as "arm64 (e.g. Raspberry Pi)".
  - `.gitignore`: drop the unexplained `example` line if nothing uses it.

- [x] **6. Final check, then publish.** Only with the owner's go-ahead at the start of this step (it is irreversible on GitHub).
  1. Run every check under "Done when" below.
  2. Set the commit identity in this repo only: `git config user.email 605500+alfredskeden@users.noreply.github.com` (details in `NOTES.md`, "Commit identity and GitHub accounts").
  3. Make sure `gh` (or the web UI) is the personal `alfredskeden` account, not the work account it is logged into today. On GitHub, confirm there are no open PRs, releases, Actions runs with artefacts, or deploy keys / secrets that should go.
  4. `git checkout --orphan public && git add -A && git commit -m "Molly: initial public release"`, check the commit's file list against `git ls-files` on the old `main`, then make `public` the new `main` locally.
  5. `git push --force origin main`; delete every other remote branch and tag (`git ls-remote origin`).
  6. In GitHub settings: turn on secret scanning and private vulnerability reporting, set description and topics (`baby-buddy`, `expo`, `react-native`, `android-widget`, `self-hosted`), turn off the wiki, then change visibility to public.
  7. Clone the public repo fresh into a temp folder and run `pnpm install && pnpm check` there.

## Done when

Before the publish (step 6.1), on the clean `main`:
- [x] A grep for every kind of personal detail in the scrub rule finds only the accepted hits: the owner's name (`LICENSE`, the Android id / Kotlin package `se.skedeback.molly` and its path) and `192.168.x` as the LAN rule.
- [x] A secret scanner over the working tree finds nothing: `gitleaks dir .` (or `trufflehog filesystem .`), run with `npx` / `brew` only with the owner's OK.
- [x] Every plan file has been read once end to end against the scrub rule (tick per folder in this plan's `NOTES.md`).
- [x] `pnpm check` passes; `git diff private/before-open-source -- apps packages` changes only comments, test fixtures and `package.json` `license` fields.
- [x] `LICENSE`, `THIRD_PARTY.md`, `CONTRIBUTING.md`, `SECURITY.md`, `plans/README.md` exist; every link in `README.md`, `CLAUDE.md` and `docs/` resolves to a file in the tree.
- [x] README screenshots show seeded test data only.

After the publish:
- [x] `git ls-remote origin` shows one branch (`main`), no tags; its commit has no parent and its author is the noreply address.
- [x] A fresh clone in a temp folder runs `pnpm install && pnpm check` green.
- [x] The repo page shows the MIT license, description and topics; secret scanning and private vulnerability reporting are on.
- [x] `~/molly-private-history.bundle` verifies and holds the old history (159 commits on `main`).

## Assumptions

- No secret lives in the tree today (scan found none); the scrub is about personal details. Step 6's scanner run confirms it.
- The owner's installed app and Baby Buddy are unaffected: no app id, signing or behaviour changes.
- Plans written after this one follow the same rule: no personal details in committed files. `CONTRIBUTING.md` says so.
