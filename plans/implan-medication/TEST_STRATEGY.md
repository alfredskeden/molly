# Medication logging: Definition of Done

Done when every item below is true. The method follows [`../implan-molly/TEST_STRATEGY.md`](../implan-molly/TEST_STRATEGY.md): integration tests against the real Baby Buddy container for `packages/api`, TDD for `packages/core`, Playwright on the web image for flows, manual review for looks.

## Client (`packages/api`, integration tests against the container)

- [x] Logging a medication with only a name stores it at the server's now; logging with a past time keeps that time.
- [x] A future time and an empty name come back as `validation` with Baby Buddy's field message.
- [x] Listing medication since a time returns only that window, across pages.
- [x] One parent can change the name, notes and time of the other parent's entry.
- [x] A parent with `core.delete_medication` can delete an entry; `e2e/seed.py` grants it and `docs/setup.md` lists it.

## Domain (`packages/core`, unit TDD)

- [x] The timeline merges medication with sleeps, feeds and diapers, newest first, and today's timeline keeps only today's.
- [x] Today's totals count medication since local midnight, not yesterday's.
- [x] Today's strip places today's medication as points, and leaves out yesterday's.
- [x] Other's text is trimmed, and empty or whitespace-only text means nothing to save.

## App flow (Playwright on the web image)

- [x] Tapping Vitamin D logs "Vitamin D" in Baby Buddy and shows "Vitamin D saved" with Adjust time. The entry then appears in Recent (yellow dot, detail "Medication"), on the Today medication lane, as "· 1 med" in the totals, and in the card header as "Last HH:MM · Vitamin D".
- [x] Adjust time on that toast ("When was it?") moves the entry's time in Baby Buddy.
- [x] Other opens the "Which medication?" sheet with the field focused. Typing "Paracetamol 2.5 ml" and tapping outside logs it and shows "Paracetamol 2.5 ml saved"; pressing Enter does the same.
- [x] Other with an empty field, closed by tapping outside, writes nothing.
- [x] With no medication today, the totals line has no "med" part and the card header says "None today".
- [x] A refused log (for example Baby Buddy unreachable) rolls back and shows a failure toast.
- [x] Opening a medication from Recent shows the edit screen with its name as the title and one Time card. Changing the name, notes and time saves to Baby Buddy, an empty name can't be saved, and delete removes the entry.
- [x] Every existing Playwright spec still passes, and `pnpm check` is green (the web bundle still has no widget code).

## Visual review (manual, web and Android, both themes)

- [ ] The Medication card, Other sheet, yellow lane, dot and chip match the design; day and night yellows read well on their backgrounds; buttons are at least 44 px tap targets.
- [ ] The widget and lock-screen notification look and behave as before.
