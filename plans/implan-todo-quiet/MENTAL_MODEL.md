# Mental model: turning off an item's reminder

## In one line

A dated to-do item can carry the tag `molly-todo-quiet`. With it, no phone reminds; the date stays.

## Where the switch lives

```mermaid
flowchart LR
  L[list row] -->|tap| V[read-only sheet<br/>shows reminder or 'No reminder']
  V -->|Edit| S[edit sheet<br/>'Remind me' switch, Android]
  S -->|Save| BB[(Baby Buddy note<br/>+ molly-todo-quiet or not)]
```

The switch is in the edit sheet only, and only on Android with a date chosen. It saves with Save, like the date.

## One rule, every place follows

```mermaid
flowchart TD
  T[note tags] --> I[todoItems<br/>quiet: true/false]
  I --> R{reminderAt}
  R -- quiet, done, undated<br/>or moment passed --> N[null]
  R -- otherwise --> A[1 h before / 19:00 evening before]
  N --> X[no bell · no alarm · 'No reminder']
  A --> Y[bell · alarm · 'This phone reminds you …']
```

`reminderAt` is the single place that knows about quiet. The bell, both sheets and the alarm schedule all ask it.

## Shared, not per phone

The tag lives on the note, so both parents' phones read it on their next fetch and drop the alarm. A reminder that already rang is cleared too. Reinstalling changes nothing.

## Date first, reminder second

Quiet only means something with a date. Saving an item with no date drops the tag, so giving it a date later starts with the reminder on. Existing items have no tag, so they keep reminding.

## Web

No reminders on the web, so no switch either. Editing an item on the web keeps its quiet state.

## Still to confirm

Shared vs per phone, both kinds of date, the switch's place and wording, dropping quiet with the date: `NOTES.md` "Decisions to confirm".
