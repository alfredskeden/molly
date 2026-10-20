# Notes: open-source Molly

## Decisions (2026-10-20)

- **History:** publish a cleaned snapshot as one initial commit. The private history (160 commits) is kept locally as a git bundle and a branch backup, never pushed publicly.
- **Repo:** flip the existing `github.com/alfredskeden/molly`: force-push the single commit to `main`, delete every other remote branch and tag, then make it public. The owner name stays visible.
- **License:** MIT for the code. Third-party data keeps its own license (see "Third-party content").
- **Audience:** self-hosting Baby Buddy families who build and run it themselves. Contributions welcome, no support promise. No CONTRIBUTING-heavy community setup.
- **CI:** none.
- **Android id:** keep `se.skedeback.molly` (and the Kotlin package), so the installed app keeps updating in place. The surname stays visible in code; that is accepted.
- **Plans:** keep all `plans/` folders, scrubbed.
- **Scrub level:** everything personal. Family details, home network, devices, password manager, key paths, dates of manual checks, sign-off quotes, the "developer's Pixel" voice.
- **Design references:** remove the private design project's id and tool instructions; design file names (`Molly Ring v4.dc.html`…) may stay as historical names of a private design source.
- **Agent files:** keep `CLAUDE.md`, `apps/molly/CLAUDE.md`, `apps/molly/AGENTS.md`, `apps/molly/.claude/`, `.vscode/`, rewritten for public contributors (no "current work" diary, no personal workflow rules).

## Found in the scan (2026-10-20)

Personal details were found in plan notes, test strategies and retros (most), a few code comments and test fixtures, `docs/android-build.md` and the logo SVG's comment. History only: Playwright traces and a personal author email on every commit, gone with the fresh commit. Not found: API keys, `.env` files, keystores or real log JSON, in the tree or in history.

## Third-party content

- WHO growth standard tables (`packages/core/src/who-weight.ts`): WHO data is CC BY-NC-SA 3.0 IGO. Needs attribution and a note that this data is not under MIT.
- Development guide text (`packages/core/src/development/`): paraphrased, every line cites a source (1177, NHS, Rikshandboken, CDC, WHO…). Needs a "not medical advice" disclaimer in the app README and an attribution list. Research notes in `plans/implan-development/research/`.
- Fonts: `@expo-google-fonts/*`, all SIL OFL, fine.
- `patches/react-native-android-widget@0.22.1.patch`: a patch of an MIT package, fine.
- Life Sim theme: own words, no trademarked names found (no "Sims" / "plumbob").

## Cleanup sweep (planning, 2026-10-20)

This plan replaces docs, not code, so little becomes dead:
- Remove: the root `CLAUDE.md` "Where things stand" diary (replaced by `plans/README.md`, step 4); README's stale "polish is in progress" line and the macOS `~/.zprofile` block in README (moved to `docs/android-build.md`, step 5); the `example` line in `.gitignore` if unused (step 5).
- Committed design export `plans/implan-ring-redesign/design/Molly Ring v4.dc.html` and the mental-model HTML artefacts in `plans/implan-molly/artifacts/`: scrub or drop (step 3).
- Spotted, not in scope: the hidden Tap log (`apps/molly/src/tap-log/`, Settings → long-press the version) is a diagnostic for `implan-instant-taps` that is still waiting on a device log. It stays local to the device and is shared only by hand, so it's fine to publish; remove it when that plan wraps up.

## Commit identity and GitHub accounts

- Commits from step 6 on use the personal account's noreply address `605500+alfredskeden@users.noreply.github.com`, set with `git config user.email` **in this repo only**. The global config is unchanged, so other repos and SSH pushes work as before. Name stays `Alfred Skedebäck`.
- The GitHub settings in step 6 (visibility, secret scanning, topics, refs check) are changed as `alfredskeden`.
- Optional, in the personal account's email settings: "Keep my email addresses private" and "Block command line pushes that expose my email".

## Plans read end to end (step 3)

Tick each folder once every file in it has been read against the scrub rule: `implan-children`, `-day-ml-total`, `-day-plan`, `-days`, `-development` (incl. `research/`), `-edit-running-start`, `-edit-stale`, `-expo-review`, `-instant-feeds`, `-instant-taps`, `-life-sim-theme`, `-live-updates`, `-measurements`, `-medication`, `-molly` (incl. `phases/`, `spikes/`, `artifacts/`), `-nap-detail`, `-nap-or-night`, `-next-nap`, `-plan-while-asleep`, `-polish`, `-recent-days-order`, `-ribbon-icons`, `-ribbon-theme`, `-ring-redesign` (incl. `design/`), `-tap-feedback`, `-themes`, `-today-window`, `-typed-time-and-nap-clock`, `-vitamin-d-reminder`, `-open-source`.

Done: all of the above, every file read end to end (2026-10-20). Kept on purpose: `se.skedeback.molly` in `adb` commands, "Pixel" where it describes Android on Pixel phones in general (`IMPORTANCE_LOW` hidden on the lock screen, the Pixel launcher), emulator setup (`molly`, `molly-36.1`, `emulator-5554` / `-5556`), plan and decision dates, the design export's own sample children (Molly, born 24 February 2026; Otto, born 12 May 2024), "Ella" in example strings. Removed beyond the scan: the upload certificate's SHA-256 fingerprint (`implan-molly/NOTES.md`), the next-nap replay's sleep count and tuning table, the family's wake / bed times.

## Answered

- Otto, Ella, Mia in the e2e specs are made-up names, not the family's children. They stay.

## Steps 2–5 (2026-10-20)

- History: 159 commits on `main` (plus the merged `redesign-ring` branch) in `~/molly-private-history.bundle`, tag `private/before-open-source`.
- Test fixtures: the seeded test child's birth date and the core fixture that used the real one are now 2026-04-27 (same age bands); the login-QR test uses `10.0.0.20` (a documentation address isn't a LAN address, so the QR rule refused it).
- Accepted grep hits outside this plan: `LICENSE` (owner's name), `packages/core/src/url.test.ts` and `docs/setup.md` (`192.168.x` as the LAN rule, not an address).
- README screenshots in `docs/screenshots/`: the web dev server with the seeded test child ("Test") and a made-up day from `e2e/look.mts`.
- `docs/android-build.md` now tells builders to change `expo.android.package` for their own copy; a build with a changed id hasn't been tried.

## Step 6 (2026-10-20)

- `gitleaks dir` over the committed tree (`git archive HEAD`): no leaks. Over the working folder it flags only the gitignored `e2e/.env.test` (the throwaway test instance's keys).
- On GitHub before the push: no PRs, releases, Actions runs or artefacts, deploy keys, secrets or forks; refs were `main` and `redesign-ring`.
- Published 2026-10-20: one commit (`Molly: initial public release`, no parent, noreply author) force-pushed to `main`, `redesign-ring` deleted on GitHub. Locally the old history is the branch `private/main`, the tag `private/before-open-source` and the bundle. Settings: description, the five topics, wiki off, secret scanning and push protection on, private vulnerability reporting on, public.
- `LICENSE` is the plain MIT text: a note under it made GitHub read it as `NOASSERTION`; the WHO note lives in `THIRD_PARTY.md` and the README.
- A fresh clone ran `pnpm install --frozen-lockfile`, `pnpm bb:seed` and `pnpm check` green.

## Open

Nothing.
