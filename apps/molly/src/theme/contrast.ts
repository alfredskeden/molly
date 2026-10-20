// WCAG contrast from the tokens' hex colours, so a token change can't quietly break legibility.

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const toHex = (rgb: number[]) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The contrast ratio between two opaque colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** `top` drawn at `opacity` over `bottom`, as `opacity-85` text over its background. */
export function over(top: string, bottom: string, opacity: number): string {
  const [t, b] = [channels(top), channels(bottom)];
  return toHex(t.map((c, i) => c * opacity + b[i] * (1 - opacity)));
}
