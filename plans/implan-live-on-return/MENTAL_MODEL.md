# Mental model: back to now when the app comes back

## The problem in one line

Only the dashboard snaps back to now on return. Left on Settings or To-do, Molly reopens there, and the parent has to find the way back to the ring.

## Before and after (Android)

A parent checks Recent days, locks the phone, and picks it up 20 minutes later.

```
           leaves on        comes back 20 min later
before     Recent days  ──▶  Recent days        (back → dashboard, maybe a past ring)
after      Recent days  ──▶  dashboard, live ring (back → leaves the app)
```

## The decision on each return

```mermaid
flowchart TD
  R[App becomes active] --> W{Web?}
  W -- yes --> SL[Dashboard showLive only<br/>as today]
  W -- no --> A{Away 60 s or more?}
  A -- no --> S[Stay as it was]
  A -- yes --> T{Molly sent the parent out?<br/>camera, photo, source link, notification settings}
  T -- yes --> S
  T -- no --> H{Tap log on screen?}
  H -- yes --> S
  H -- no --> L[Dismiss to the dashboard<br/>then showLive]
```

"Stay" means nothing at all changes, on the dashboard too: a past ring, the editor, the open panel all stay.

## Unsaved input is dropped

After a minute away, a half-written to-do or an unsaved setting goes with its screen, and Molly says so.

| What was open | What the parent sees |
| --- | --- |
| Settings or child screen with changes | live ring + "Changes not saved" (their existing toast) |
| To-do, measurement or Add entry sheet, or the dashboard editor, **with changes** | live ring + "Changes not saved" |
| Any of those **without** changes | live ring, no message |

One toast, however many drafts went. Each sheet tells the provider whether it has changes; a pure has-changes rule per sheet decides that.

## A trip is one return

```
tap Camera   ──▶ mark "on purpose" ──▶ camera (3 min) ──▶ back: mark used, stay
lock phone 5 min later ──────────────────────────────────▶ back: no mark, go live
```

## Where it lives

```mermaid
flowchart LR
  AS[AppState change] --> M[return model<br/>features/return/model.ts<br/>pure, unit-tested]
  O[leaveOnPurpose<br/>pickPhoto, openLink, turnOnNotifications] --> P
  RT[current route<br/>/tap-log?] --> P
  U[useUnsavedOnReturn<br/>to-do, measurement, Add entry, editor] --> P
  M --> P[ReturnProvider<br/>in the main layout]
  P -- go live, Android --> D[dismiss to /]
  P -- go live / show live --> SL[dashboard showLive<br/>via useOnLive]
  P -- go live, a draft changed --> TO[Changes not saved toast]
```

The provider sits in the signed-in layout, so onboarding and "Can't sign in" never see it.

## What goes away

The dashboard's own "every return → now" listener. On Android the dashboard now waits for the same minute as every other screen; on the web the shared listener still snaps it back on every return. Its in-app glance timer (a past ring goes back to now after a minute on screen) stays.

## Web

Unchanged: showing the tab again puts the dashboard on the live ring, and screens above it stay where they were.
