/** A source page, in a new tab: expo-linking's web `openURL` would replace Molly. */
export function openLink(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
