// A trip out of the app that Molly started (camera, photo picker, a source link, Android's notification
// prompt or settings): the return from it keeps the screen, however long it took. Module state, not React,
// so the code that leaves can mark it without a hook.

/** `away`: an action that leaves is still running. `oneReturn`: the next return is the trip's. */
let trip: 'none' | 'away' | 'oneReturn' = 'none';
let active = true;

/** Right before Molly sends the parent out with nothing to wait for (a link, Android's settings): one return. */
export function leaveOnPurpose(): void {
  trip = 'oneReturn';
}

/**
 * An action that takes the app away and settles once back (the camera, a permission prompt). Every return
 * while it runs is the trip's: Android can flicker background → active a few times before the camera opens.
 * Once it settles the trip ends, or with the app still away, ends with the next return.
 */
export async function awayOnPurpose<T>(action: () => Promise<T>): Promise<T> {
  trip = 'away';
  try {
    return await action();
  } finally {
    if (trip === 'away') trip = active ? 'none' : 'oneReturn';
  }
}

/** Every `AppState` change goes through here; true when this one is a return from a trip. */
export function tripOnAppState(status: string): boolean {
  active = status === 'active';
  if (!active || trip === 'none') return false;
  if (trip === 'oneReturn') trip = 'none';
  return true;
}
