# Mental model: turning off an item's reminder on this phone

## In one line

Each phone keeps a list of to-do ids it won't remind about (`settings.todoQuiet`). The item, its date and the other parent's reminders don't change.

## Where the switch lives

```mermaid
flowchart LR
  L[list row] -->|tap| V[read-only sheet<br/>reminder or 'No reminder']
  V -->|Edit| S[edit sheet<br/>'Remind me' switch, Android]
  S -->|Save| BB[(Baby Buddy note<br/>date, text as before)]
  S -->|Save, after the id is known| Q[(this phone<br/>settings.todoQuiet)]
```

The switch is in the edit sheet only, on Android with a date chosen. It saves with Save, like the date.

## One rule, every place follows

```mermaid
flowchart TD
  I[item + todoQuiet] --> R{reminderAt}
  R -- id in todoQuiet, done, undated<br/>or moment passed --> N[null]
  R -- otherwise --> A[1 h before / 19:00 evening before]
  N --> X[no bell · no alarm · 'No reminder']
  A --> Y[bell · alarm · 'This phone reminds you …']
```

`reminderAt` is the single place that knows about quiet. The bell, both sheets and the alarm schedule all ask it.

## Per phone

```mermaid
flowchart LR
  N[(note 42<br/>Vaccination 15:00)] --> P1[Phone A<br/>todoQuiet: 42] --> X[no alarm]
  N --> P2[Phone B<br/>todoQuiet: empty] --> Y[reminds 14:00]
```

Each phone decides for itself. Sign-out or a reinstall forgets the list, so reminders come back on.

## Date first, reminder second

Quiet only means something with a date. Saving with no date takes the id out, so a later date starts with the reminder on. Pruning drops ids of items that are gone or have lost their date; done items stay, so unticking keeps it quiet.

## Web

No reminders on the web, so no switch either. The web never touches a phone's list.
