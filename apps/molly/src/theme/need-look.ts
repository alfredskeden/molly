// Life Sim's needs layer as a theme slot (`Look.needs`): the colours a need is drawn in and its words. Plain
// data, no React. Screens check the slot, never the theme key.

import type { SimWords } from './sim-words';

/**
 * Colours as hex. `colors` / `inks`: a need's colour (bar, icon circle, mood pill, Wants ring) and its level
 * label's ink, one per tenth from 0 (red) to 100 (green), the design's `needCol` / `needInk` quantised to the
 * bar's ten segments. `off`: an empty segment; `offRunning` one on a running tile's solid card. `face`: the
 * icon on a need colour, the mood face and chip text. `bow`: the green face on Settings' Theme row; `toast`
 * the toast's face and Edit (≥ 4.5 : 1 on the toast's `ink`).
 */
export type NeedsLook = {
  colors: string[];
  inks: string[];
  off: string;
  offRunning: string;
  face: string;
  bow: string;
  toast: string;
  words: SimWords;
};

/** A need value's colour and label ink: the nearest tenth. */
export function needTone(needs: NeedsLook, value: number): { color: string; ink: string } {
  const tenth = Math.round(Math.min(100, Math.max(0, value)) / 10);
  return { color: needs.colors[tenth]!, ink: needs.inks[tenth]! };
}
