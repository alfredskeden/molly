# Development guide: the picture

Full plan in [`MAIN.md`](MAIN.md), sources in [`NOTES.md`](NOTES.md).

## In one line

An offline age guide, birth to 3 years, inside each child's screen: what many children do now, what to try, when to get help, and where to read more.

## Where it sits

```mermaid
flowchart LR
  C[Child screen] -->|Development card| O[Overview of a page]
  O -->|topic row| T[Topic]
  O -->|All ages| A[All ages]
  A -->|tap a page| O
  O -->|month strip| O
  T -->|Read more| W[(Official source<br/>in the browser)]
  T -->|Health| M[Weight screen]
```

The guide opens on the child's own page. Browsing changes the page, never the child.

## Pages

```mermaid
flowchart LR
  N[Newborn] --> M1[1 m] --> M2[…] --> M11[11 m] --> P12[12 m] --> P15[15] --> P18[18] --> P21[21] --> P24[24] --> P30[30] --> P36[36 m]
```

19 pages: monthly in the first year, then every 3 months, then every 6. A child is on the last page they've reached. After 3 years the card says the guide has ended.

## What a page holds

Every page has the same 8 topics:

Movement · Sounds and talking · Sleep · Feeding · Play and senses · Feelings and social · Health · Parents' corner

Each topic has:
- a headline and intro
- many children around now
- try together
- when to get help
- read more

Every claim links back to an official source.

## One text, many pages

Writing doesn't happen page by page. A topic's text covers a range of pages, and each page uses the one that covers its age.

```mermaid
flowchart LR
  E1["Parents' corner: Newborn–2 m"] --> N[Newborn] & M1[1 m] & M2[2 m]
  E2["Parents' corner: 3–6 m"] --> M3[3 m] & M4[…] & M6[6 m]
```

So text only changes where children really change.

## Region swaps a few parts

One setting on the phone: **Sweden** (the default) or **International**. Most text is shared, and the region only swaps these parts:

| Part | Sweden | International |
| --- | --- | --- |
| Check-ups | BVC visit around this age | What many countries check, local programme |
| Vaccines | Swedish programme (6 wk, 3, 5, 12, 18 m) | WHO tables, local programme |
| Food | Tiny tastes from 4 m at the earliest, D-drops to 2 y | Solids around 6 m, ask about vitamin D |
| Get help | BVC, 1177, 112 | Doctor or nurse, local emergency number |
| Read more | 1177, Rikshandboken, Livsmedelsverket first | WHO, CDC, NHS first |

## The child's own data

```mermaid
flowchart LR
  S[Molly's sleep logs] -->|last 7 days| SL[Sleep topic: average next to the typical range]
  W[Measurements] --> H[Health topic: link to weight]
  D[Vitamin D logs] -->|Sweden, under 2| HV[Health / Feeding: given today?]
```

Sleep shows numbers only, never "too little" or "too much", and only once 3 full days are logged.

## Safety first

- "Not medical advice" on every screen.
- A "when to get help" box in every topic, with the right contacts.
- A one-time note the first time the guide opens.
- Wording says "many children", never "should".
- All text is our own words. Sources are credited and linked, never copied, and no logos are used.

## Where the code goes

| Part | Place |
| --- | --- |
| Pages, content, sources, rules | `packages/core/src/development/` (pure, tested) |
| Region and first-open flag | `Settings` in `apps/molly/src/storage/types.ts` |
| Screens | `src/app/(main)/child/[id]/development/` |
| Link check | `pnpm check:sources` |
