# Ribbon theme, in pictures

## What it is

A seventh theme. Same app, same layout, new look: dusty rose by day, plum with gold flecks by night. Three ornaments make it Ribbon: a **bow**, a **teddy**, a **stitch**.

Other themes don't change.

## Where the look comes from

```mermaid
flowchart LR
  T["themes.ts<br/>ribbon: day / night Look"] --> P[palette<br/>incl. accent, track]
  T --> F[fonts<br/>DM Serif Display + Mulish]
  T --> H[header art<br/>stripes + gold flecks]
  T --> O[ornaments<br/>bow, teddy, stitch colours]
  C["copy.ts<br/>ribbon words"] --> App
  P --> App[App screens]
  F --> App
  H --> App
  O --> App
  P --> W[Widgets]
  F --> W
  C --> W
```

Widgets get colours, fonts and words. No ornaments, no header.

## Two new kinds of setting

**Tokens every theme has now.** `accent` (primary buttons), `on-accent` (text on them), `track` (the ring's track). Old themes set them to what they already used (`ink`, `bg`, `line`), so they look the same. Ribbon sets rose.

**A slot only Ribbon fills.** `ornaments` is empty for every other theme. Screens ask "is there a bow?", never "is this Ribbon?". Another theme could fill it later.

## Where the ornaments show up

```mermaid
flowchart TB
  O{ornaments set?} -- no --> N[today's look]
  O -- yes --> R[Ring]
  O -- yes --> S[Every sheet]
  O -- yes --> K[Pickers]
  O -- yes --> G[Settings]
  O -- yes --> Q[Toast]
  R --> R1[bow tied at the top, cap in its knot]
  R --> R2[dashed stitch along the track]
  R --> R3[teddy in the bottom-left corner]
  S --> S1[bow instead of the grab bar]
  K --> K1[small bow in the tracker's colour]
  G --> G1[bow by the title and the Theme row]
  Q --> Q1[heart in bow colour]
```

## The teddy's eyes

```mermaid
stateDiagram-v2
  Awake: eyes open
  Sleepy: eyes closed
  Awake --> Sleepy: a sleep starts
  Sleepy --> Awake: the sleep stops
```

It fades with the rest of the ring while you edit an entry.

## Order of work

```mermaid
flowchart LR
  A[1 Tokens<br/>old themes unchanged] --> B[2 Ribbon look<br/>pickable, no ornaments]
  B --> C[3 Ring ornaments]
  C --> D[4 Ornaments elsewhere]
  D --> E[5 Look review<br/>+ wording review]
```

Each step ships on its own with `pnpm check` green.

## Words

The design names one label: **Sweet dreams** while asleep. The rest get drafted in that soft tone and reviewed. Screen readers, History and errors keep plain words, as in every theme.
