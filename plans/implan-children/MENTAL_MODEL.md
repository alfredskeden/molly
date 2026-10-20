# More than one child: mental model

## In one line

One child on screen at a time; swipe the avatar stack to move on, tap it to pick. Everything else (widgets, lock screen, reminders) always knows which child it's about.

## The dashboard

```
┌──────────────────────────────────┐
│ Ella                    (M)(O)   │  ← stack: shown child in front,
│ 5 months · Mon 28 Sep      (E)   │     up to two behind
│ ┌──────────────────────────────┐ │
│ │ (O) Otto is sleeping · 42m [Switch]│  ← only when another child sleeps
│ └──────────────────────────────┘ │
│  hero · Today · tiles · Recent   │  ← all Ella's, as today
└──────────────────────────────────┘
```

- **Pull down** on the stack: the front avatar shrinks away and the next comes forward. Past halfway it switches on release, and the toast says "Showing Otto".
- **Tap** the stack: the Children sheet opens (a row per child with "Sleeping 42m" / "Awake 1h 25m", then Manage children and Settings).
- **One child**: a single avatar, no pull, and tap still opens the sheet.

## Where things live

```mermaid
flowchart LR
  BB[(Baby Buddy<br/>children, timers, entries)] --> Q[Query cache<br/>keyed by childId<br/>holds every child]
  S[Settings on this phone<br/>childId = child on screen<br/>children: prefs per child] --> Q
  Q --> D[Dashboard<br/>child on screen]
  S --> W[Widget cache<br/>snapshot of child on screen<br/>timers + reminders per child]
  BB --> W
  W --> WG[Widgets]
  W --> N[Lock-screen notifications<br/>one per child and timer]
```

- **Per child** (on the child's own screen): shown or hidden, colour, nap window, bottle defaults, Vitamin D reminder.
- **Shared** ("For every child"): theme, lock-screen timer, haptics.
- Name and birth date come from Baby Buddy. Molly never edits them.

## Which children show

```mermaid
flowchart TD
  A[Baby Buddy's children, in order] --> B{hidden in prefs?}
  B -- yes --> H[not in the stack, sheet,<br/>notifications]
  B -- no --> C[shown]
  C --> E{child on screen<br/>still shown?}
  E -- no --> F[first shown child takes over]
```

- A new child in Baby Buddy appears shown, with the next colour.
- The last shown child can't be hidden.
- Onboarding: "Which children?" with all ticked. The unticked ones are saved hidden. One child skips the step.

## Taps always hit the right child

```mermaid
sequenceDiagram
  participant P as Parent
  participant X as Widget / notification
  participant R as runWidgetIntent(intent, child)
  participant BB as Baby Buddy
  P->>X: Stop (Otto's notification)
  X->>R: intent + child = Otto
  R->>BB: stop Otto's molly:sleep
  BB-->>R: saved
  R-->>X: answer, then refresh
```

- **Widget**: shows the app's child on screen, with a badge when several are shown. A tap acts on the child it drew.
- **Notification**: each carries its child in the action. Two sleeping children means two notifications, "Ella · Sleeping" and "Otto · Sleeping".
- **Vitamin D reminder**: per child, and only after a stop of that child with its switch on.

## With one child

Same as today plus the avatar: no strip, no badge, and no names in the notifications.
