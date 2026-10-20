import * as Linking from 'expo-linking';

/** A source page, in the phone's browser. */
export function openLink(url: string): void {
  void Linking.openURL(url).catch(() => undefined);
}
