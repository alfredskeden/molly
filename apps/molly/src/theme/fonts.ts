import type { Look } from './themes';

// Android gets every theme's faces at build time: app.json's `expo-font` plugin registers one family per
// face with a file per weight, so `fontWeight` picks the file. Nothing to load at run time. Web: fonts.web.ts.
export async function loadFonts(_look: Look): Promise<void> {}
