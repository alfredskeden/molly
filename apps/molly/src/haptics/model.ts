import type { AdjustOutcome, Outcome } from '@/actions/trackers';

/** The design's four strengths plus warning and error, each with one meaning. */
export type Strength = 'medium' | 'success' | 'light' | 'selection' | 'warning' | 'error';

export type HapticAction = 'startTimer' | 'stopTimer' | 'log' | 'cancel' | 'choose' | 'step' | 'armDelete';

/**
 * Played on the tap itself (the optimistic update), so it feels instant. Saving on the edit screen,
 * navigation and scrolling play nothing: the screen change is feedback enough.
 */
export const HAPTICS: Record<HapticAction, Strength> = {
  startTimer: 'medium', // a timer began: the strongest everyday tap
  stopTimer: 'success', // something saved with a duration
  log: 'light', // one-tap logs happen often
  cancel: 'light', // undo-like; the toast carries the message
  choose: 'selection', // a choice changed, nothing saved yet
  step: 'selection', // one tick per step, like a dial
  armDelete: 'warning', // "are you sure" without a dialog
};

/** Added when Baby Buddy answers: "already" is a warning, nothing saved an error (with the danger toast). */
export function answerStrength(outcome: Outcome | AdjustOutcome): Strength | null {
  switch (outcome.type) {
    case 'alreadyRunning':
    case 'alreadyStopped':
      return 'warning';
    case 'failed':
    case 'permissionNeeded':
      return 'error';
    default:
      return null;
  }
}

/** Plays through `play` only while the parent's Haptics setting is on. */
export function hapticPlayer(play: (strength: Strength) => void, enabled: boolean) {
  return (strength: Strength | null) => {
    if (enabled && strength) play(strength);
  };
}
