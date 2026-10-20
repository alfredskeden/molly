# Molly: mental model

The picture to hold in your head. [`MAIN.md`](MAIN.md) has the full detail.

## 1. Molly is just a remote control

Molly stores nothing of its own. Every tap is an API call to your Baby Buddy, and Baby Buddy is the only source of truth.

```mermaid
flowchart LR
  A[Android app] --> BB[(Baby Buddy)]
  W[Home-screen widget] --> BB
  WEB[Web app on the Pi] --> BB
  P1((Parent 1)) --- A
  P1 --- W
  P2((Parent 2)) --- WEB
```

Each parent has their own Baby Buddy user and API key. No Molly server, no proxy, no sync service.

## 2. What lives where

| Where | What |
| --- | --- |
| Baby Buddy | All entries, running timers, children |
| Phone: SecureStore | Baby Buddy URL, API key, "my user id" |
| Browser: localStorage | The same, for web |
| Device: AsyncStorage | Settings (bottle type and amount, nap window, child) and the widget's last snapshot |

Settings are **per device**. The two parents can set them differently.

## 3. Timers are the shared state

Sleep and feeding use Baby Buddy **timers**. A running timer is visible to both parents, so either one can stop it.

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Running: Start → POST /api/timers/ (name molly#58;sleep or molly#58;feeding)
  Running --> Idle: Stop → POST entry with timer id (Baby Buddy deletes the timer)
  Running --> Idle: Cancel → DELETE timer
```

Diaper changes are instant, so there's no timer: one POST per change.

## 4. Every tap says what it means

Taps say **start** or **stop**, never "toggle". Before acting, Molly checks what Baby Buddy says right now.

```mermaid
flowchart TD
  T[Tap: stop sleep] --> F[Fetch current molly:sleep timer]
  F -->|exists| S[POST /api/sleep/ with timer]
  F -->|none| AS["Show 'already stopped'"]
  S -->|201| OK[Refresh widget and app]
  S -->|404| AS
  S -->|403| NP["Show 'started by someone else,<br/>you need permission' + help link"]
```

So a stale widget can never make a wrong write. At worst it shows "already stopped".

## 5. One tap fills in the rest

| Button | What gets logged |
| --- | --- |
| Stop sleep | `nap` = true if sleep started inside the daytime window (default 07:00–19:00) |
| Feeding: Left / Right | `breast milk` + `left breast` / `right breast` |
| Feeding: Bottle | `bottle` + your default type + your default amount (ml) |
| Diaper: Wet / Dirty / Both | `wet` / `solid` / both |

Everything can be edited later in the app: amount, method, nap, times, color, notes, tags (e.g. "mixed").

## 6. How fresh is what you see?

Baby Buddy can't push updates, so each surface decides when to re-check.

| Surface | Refreshes when… | Worst-case staleness for the *other* parent's actions |
| --- | --- | --- |
| App or web, dashboard open | focus, foreground, every 30 s | about 30 s |
| Widget | you log in the app, open the app, tap the widget, every 30 min | about 30 min |
| Lock-screen notification (redesign) | same moments as the widget, plus any start or stop on this phone | until this phone's app or widget next looks |

If the widget can't reach Baby Buddy, it keeps showing its last snapshot, labelled "not updated since HH:MM".

## 7. The widget runs without the app

A widget tap wakes a **headless** JavaScript task. There's no screen, no React and no app state: just credentials, settings and the API client.

```mermaid
sequenceDiagram
  participant H as Home screen
  participant T as Widget task (headless)
  participant B as Baby Buddy
  H->>T: tap FEED_STOP_LEFT
  T->>T: read URL + key (SecureStore), settings (AsyncStorage)
  T->>B: check timer, then POST /api/feedings/
  T->>H: re-render rows + "Logged 14:05"
```

That's why the API client and domain rules live in plain TypeScript packages with no React.

## 8. Code shape

```mermaid
flowchart TB
  APP["apps/molly<br/>screens, hooks, storage adapters,<br/>widget (*.android.tsx)"] --> API
  APP --> CORE
  API["packages/api<br/>Baby Buddy client + types"]
  CORE["packages/core<br/>pure rules: nap, defaults,<br/>totals, timeline, timer decisions"]
  E2E[e2e/ Playwright] -.tests.-> APP
  DOCKER[docker/ nginx image] -.serves web build of.-> APP
```

`core` has no I/O. `api` has no UI. Only `apps/molly` knows about React.

## 9. Getting a parent set up

```mermaid
flowchart LR
  U[URL + API key] --> V{GET /api/profile/}
  V -->|ok| C[Pick child<br/>auto if only one]
  C --> K[Checklist:<br/>permission to stop<br/>other parent's timers]
  K --> D[Dashboard]
  V -->|401/403| E1[Key rejected]
  V -->|network| E2[Can't reach:<br/>check CORS / Cloudflare Access]
```

Molly can't check that permission itself. It explains it once, then gives a clear message if a stop fails.

## 10. Deployment

```mermaid
flowchart LR
  MAC[Mac] -- docker build + save arm64 --> TAR[Image tarball]
  TAR -- docker load + compose up --> PI[Raspberry Pi: nginx + web build]
  MAC -- gradlew assembleRelease --> APK[Signed APK] -- adb / sideload --> PHONE[Phones]
  PI --> CFT[Cloudflare Tunnel<br/>Molly behind Access]
  BB[(Baby Buddy)] --> CFT2[Cloudflare Tunnel<br/>/api/* bypasses Access]
```

Baby Buddy needs `CORS_ALLOWED_ORIGINS` to include Molly's web address. The signing keystore lives outside the repo and is backed up. If you lose it, you can't update the installed app.

## 11. A tap feels instant, the server still decides

From the redesign on, the screen changes the moment you tap, using the phone's clock. Baby Buddy's answer then replaces the guess.

```mermaid
sequenceDiagram
  participant U as Parent
  participant M as Molly
  participant B as Baby Buddy
  U->>M: tap Start feed
  M-->>U: hero shows timer now (guess)
  M->>B: check timer, then POST /api/timers/
  B-->>M: created, real start
  M-->>U: hero uses real start + toast "Feeding started 09:14 · Adjust time"
  U->>M: Adjust time → "10m ago"
  M->>B: PATCH /api/timers/{id}/ start
```

If Baby Buddy says "already running", "already stopped" or fails, the guess is dropped and the toast says why. "Adjust time" also works after a stop (moves the end) and a diaper log (moves the time). Times never go into the future.

## 12. Day, night and the widgets

The theme follows the phone, or a Day / Night choice made in the app header. Widgets follow the same choice.

| Widget | Sizes it adapts to |
| --- | --- |
| Molly (all three) | 2×1 glance → 4×2 → 4×3 |
| Sleep, Feeding, Diaper | 1×1 one button → 2×1 → 2×2 with timer |

Widgets can't tick, so they show when a timer started. The lock-screen notification is the live, ticking timer, with Stop (sleep) or Left / Right / Bottle (feeding) that work without opening the app.

## 13. Roadmap

```mermaid
flowchart LR
  MVP["MVP<br/>onboarding, 3 trackers,<br/>dashboard, widget, deploy"] --> RD["Redesign<br/>day/night, new dashboard,<br/>adjust time, widgets, notification"] --> POL[Polish] --> MC[Multi-child UI] --> PR["Smart predictions<br/>age defaults + history"]
```

The MVP is detailed in [`phases/mvp/MAIN.md`](phases/mvp/MAIN.md), the redesign in [`phases/redesign/MAIN.md`](phases/redesign/MAIN.md). Each starts by proving its riskiest native piece: the MVP the headless widget, the redesign the lock-screen notification's headless actions.
