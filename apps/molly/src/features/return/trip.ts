// A trip out of the app that Molly started (camera, photo picker, a source link, Android's notification
// prompt or settings): the return from it keeps the screen, however long it took. Module state, not React,
// so the code that leaves can mark it without a hook.

let marked = false;

/** Call right before Molly sends the parent out of the app. */
export function leaveOnPurpose(): void {
  marked = true;
}

/** Whether this return ends a trip; used up by it. */
export function takeTrip(): boolean {
  const trip = marked;
  marked = false;
  return trip;
}
