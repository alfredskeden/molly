# Life Sim theme

Context: the theme engine from [`../implan-themes/MAIN.md`](../implan-themes/MAIN.md) (a theme is data in `themes.ts`, words in `copy.ts`, fonts, header art, widgets), how Ribbon added a theme with extras ([`../implan-ribbon-theme/MAIN.md`](../implan-ribbon-theme/MAIN.md): accent tokens, an `ornaments` slot on `Look`), and the root `CLAUDE.md`. Decisions and defaults are in [`NOTES.md`](NOTES.md). The Definition of Done is in [`TEST_STRATEGY.md`](TEST_STRATEGY.md).

**Outcome:** an eighth theme, **Life Sim**, picked in Settings → Theme: cool blue and white by day, navy by night, Fredoka over Mulish, a criss-cross header. It plays the baby like a life-sim character:

- every tile carries a **need bar** that drains from green to red as time since the last entry grows, measured against the child's own rhythm, with a playful label per level (`Snacky`, `Code brown`);
- a **mood pill** at the ring's top (Giggly … Wailing, Dreaming while asleep) from the average need;
- a **Wants** thought bubble in the ring's bottom-left corner showing the most urgent need;
- a row of **moodlets** above the window row (`Fresh bum +1`, `Hangry −3`).

Widgets and the notification follow its palette, fonts and words only. Every other theme looks and behaves exactly as today.

## The design source

`Molly Sim Board.dc.html`, the (private) design source. It is an index page: eleven screens (dashboard, meltdown, sleeping, feed picker, diaper picker, editor, toast, Today sheet, Add entry sheet, Settings, Theme sheet), each in day and night. Every phone is `Molly Sim App.dc.html` with props `screen` and `mode`; that file is the spec:

- **Tokens**: the `sim-day` / `sim-night` CSS blocks at the top (oklch; convert to hex as the other themes did).
- **Needs**: `NEED`, `needCol`, `needInk` and `tile()` in its script (levels, labels, colours). Its fixed drain times (`mins`) are replaced by the child's rhythm (below).
- **Mood, Wants, moodlets**: `MOODS`, `want`, `pos` / `neg` in `renderVals()`.
- **Theme sheet**: its `THEMES` list (Life Sim third, "New" badge).

`support.js` is the canvas runtime, not design content. The design's times and entries are illustrative and its layout is today's app (Ring v4): only the look and the needs layer are new. Exact sizes, words and rules read from it are in `NOTES.md` under "Design facts".

## How it fits together

```
entries query (polled)  ──► last entry per kind ─┐
nextSleep (existing)    ──► sleep due time ──────┤
rhythm query (once per  ──► usual gap per kind ──┼─► needs (core, pure) ─► tiles: bar + level label
  day / night window)                            │                      ─► mood pill, Wants bubble
Vitamin D pref + last dose ──► medicine (24 h) ──┘                      ─► moodlets row, centre words
```

- **Pure rules in core** (`packages/core/src/needs.ts`, new): a need's value 0–100 from "since" and "due"; its level 0–3; the usual gap per kind and window kind from 14 days of entries (median, fallback, outliers dropped); the sleep need from the last wake and `nextSleep`; mood from the average (medicine left out); Wants (lowest need under 60); moodlets. No words or colours: those are the theme's.
- **The rhythm query** (`features/dashboard/queries.ts`): `['rhythm', childId, window kind, window start]`, fetches 14 days of feedings and changes, returns only the medians `{ feed, diaper }`. `staleTime: Infinity`, persisted (`PERSISTED` in `src/lib/query-rules.ts`), excluded from the refresh-on-write invalidations; a new window start is a new key, so it fetches once per window. Enabled only while the theme has a `needs` slot.
- **`useNeeds`** (app hook, `features/needs/`): combines the polled entries, running timers, `nextSleep`, the rhythm and the child's Vitamin D pref into the core rules, ticking with the dashboard's shared clock (`useNow`). Returns null when the theme has no `needs` slot, so nothing is computed elsewhere.
- **`needs` on `Look`** (`themes.ts`, plain data, null except Life Sim): the 11-step need colours and inks as hex per scheme, the empty-segment colour, the Wants bubble's and toast face's green. Screens check the slot, never the theme key.
- **Life Sim's words** (`src/theme/sim-words.ts`, new): level labels per kind, mood names, moodlet names, `Way past nap time`, toast leads. Read only through the `needs` slot and only with Playful labels on.
- **`stitch` on `Look`**: the dashed line along the ring's track moves out of `Ornaments` into its own slot so Ribbon and Life Sim both set it.
- **Where the needs layer shows** when the slot is set:
  - Tiles (`features/dashboard/Tiles.tsx`): the icon in a need-coloured circle, the level label, the 10-segment bar; a running timer's tile shows `Recharging…` and a fixed bar at 82 (the design's value). Medicine shows none without the Vitamin D reminder.
  - Ring (`features/ring/Ring.tsx`): the mood pill behind the cap (cap stays the tap target), the Wants bubble bottom-left, both dimmed with the inline editor; the mood word as a chip under the centre's time, `Way past nap time` when the sleep need is empty.
  - Dashboard: the moodlets row above the window row, only while the tiles show.
  - Toast (`features/toast/toast.tsx`): the green face before the text, the kind's top label as a lead, Edit in green.
  - Settings: a face icon before the theme's name on the Theme row.
- **Copy** (`src/theme/copy.ts`): a full `sim` entry. The design gives `awake` `Up and about`, `feeding` `Refuelling`, `sleeping` `Recharging`, `stopSleep` `Wake up`, `stopAs` `Stop and save as`, `cancelFeed` `Cancel feed`; draft the rest in that tone. The drafted wording still needs a review.
- **Look**: palettes (hex, every key the others have, contrast-tested), Fredoka + Mulish (`app.json` `expo-font`, widget `fonts`, `fonts.web.ts`), criss-cross header with night dots (`art.ts`), `accent` / `track` from the design.

## Steps

Each step lands on its own with `pnpm check` green.

- [x] **1. Needs rules (core, TDD).** `needs.ts`: value and level, usual gap per kind and window kind with fallback, sleep need from `nextSleep`, mood without medicine, Wants, moodlets. Exported from `@molly/core`.
- [x] **2. Life Sim look.** `sim` third in `THEME_KEYS`, day and night palettes, fonts (app, web, widget), header art, `isNew` moved from Ribbon, `stitch` slot (Ribbon unchanged), `needs` slot data, the `sim` copy entry and the word table. Pickable and complete except the needs layer. Widgets checked on the emulator.
- [x] **3. Rhythm and `useNeeds`.** The rhythm query (once per window, persisted, not polled), the hook, the Vitamin D medicine rule. Verified: no rhythm request on a poll or a write, one on a window change.
- [x] **4. Tiles.** Need circle, level label, bar; running state; medicine without a bar when the reminder is off; Playful off hides the words.
- [x] **5. Ring, moodlets, toast, Settings.** Mood pill behind the cap, Wants bubble, centre chip and `Way past nap time`, moodlets row, toast face, Theme row face.
- [x] **7. Needs follow the night (found on a phone).** Gaps by their middle, a running sleep filling to its likely wake (`sleepingSpan`), checked on a seeded two weeks. See `NOTES.md`.
- [ ] **6. Look review.** (Web and emulator done, see `NOTES.md`; left: the wording review and the remaining boxes in `TEST_STRATEGY.md`.) Life Sim against the design's eleven screens, day and night, web and emulator, largest font; other themes spot-checked; wording reviewed. Per `TEST_STRATEGY.md`.

## Shape

```
packages/core/src/needs.ts                    new: the needs rules
apps/molly/src/theme/themes.ts                sim look; needs and stitch slots; isNew moved
apps/molly/src/theme/tokens.ts                sim palettes
apps/molly/src/theme/art.ts                   criss-cross (+ night dots)
apps/molly/src/theme/copy.ts                  sim entry
apps/molly/src/theme/sim-words.ts             new: level, mood, moodlet words
apps/molly/src/theme/ornaments.ts             stitch moves out
apps/molly/src/features/needs/                new: useNeeds, MoodPill, WantsBubble, Moodlets, NeedBar
apps/molly/src/features/dashboard/queries.ts  rhythm query
apps/molly/src/lib/query-rules.ts             rhythm persisted
apps/molly/src/features/dashboard/Tiles.tsx   need bar and label
apps/molly/src/features/ring/Ring.tsx         mood pill, Wants bubble, centre chip
apps/molly/src/features/toast/toast.tsx       face and lead
apps/molly/app.json, src/theme/fonts.web.ts   Fredoka
```

## Assumptions

- The theme engine and Ribbon's additions work as their plans describe (`accent` / `on-accent` / `track` tokens, `Look` slots read by components, widgets reading `look` from `Settings`). Their `NOTES.md` "Found while building" has the workarounds.
- No layout changes beyond the tile's height (it grows for the label and bar) and the moodlets row. If the design shows something today's app doesn't have, the app wins and the difference goes in `NOTES.md`.
- Needs are computed on the device and never stored in Baby Buddy; only the rhythm medians are cached, per child and window.
- Rules work for any child: never tune thresholds to one family's baby. Real logs are only a sanity check.
