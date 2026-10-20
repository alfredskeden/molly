import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { vars } from 'nativewind';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, useColorScheme, View } from 'react-native';

import { loadSettings, updateSettings } from '@/storage/settings';
import { DEFAULT_SETTINGS, type Settings, type ThemePreference } from '@/storage/types';
import { syncWidget } from '@/widget/sync';

import { copyFor, type Copy } from './copy';
import { loadFonts } from './fonts';
import { setNightMode } from './night-mode';
import { resolveScheme } from './scheme';
import { lookVariables, THEMES, type Look, type ThemeKey } from './themes';
import type { Palette, Scheme } from './tokens';

type Theme = {
  preference: ThemePreference;
  scheme: Scheme;
  /** Which theme (Settings' Theme card). */
  look: ThemeKey;
  /** The theme's own labels, or the plain ones. */
  playful: boolean;
  /** Raw colours, for the few props that don't take classes (placeholderTextColor and the like). */
  palette: Palette;
  setPreference: (preference: ThemePreference) => void;
  setLook: (look: ThemeKey) => void;
  setPlayful: (playful: boolean) => void;
};

type Stored = Pick<Settings, 'theme' | 'look' | 'playful'>;

const ThemeContext = createContext<Theme | null>(null);

const variables = new Map<Look, ReturnType<typeof vars>>();

const px = Platform.OS === 'web' ? (length: number) => `${length}px` : (length: number) => length;

/** The look's CSS variables, made once per look so the style object stays the same between renders. */
function variablesFor(look: Look) {
  let style = variables.get(look);
  if (!style) {
    const night = Object.values(THEMES).some((theme) => theme.night === look);
    style = vars(lookVariables(look, night ? 'night' : 'day', px));
    variables.set(look, style);
  }
  return style;
}

/** Stores one change and redraws the widgets, which draw the same settings. */
function store(change: Partial<Stored>) {
  updateSettings(change)
    .then(syncWidget)
    .catch(() => undefined);
}

/** Renders nothing until the stored settings and the theme's fonts are in, so the first frame is already right. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [stored, setStored] = useState<Stored | null>(null);

  useEffect(() => {
    // Settings that can't be read: the default theme, rather than the splash forever.
    loadSettings()
      .catch(() => DEFAULT_SETTINGS)
      .then(async ({ theme, look, playful }) => {
        await loadFonts(THEMES[look].day).catch(() => undefined);
        setStored({ theme, look, playful });
      });
  }, []);

  const preference = stored?.theme;
  useEffect(() => {
    if (preference) setNightMode(preference);
  }, [preference]);

  const scheme = resolveScheme(preference ?? 'system', system);
  const look = THEMES[stored?.look ?? 'classic'][scheme];
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(look.palette.bg).catch(() => undefined);
  }, [look]);

  const theme = useMemo<Theme | null>(
    () =>
      stored && {
        preference: stored.theme,
        scheme,
        look: stored.look,
        playful: stored.playful,
        palette: look.palette,
        setPreference: (next) => {
          setStored((current) => current && { ...current, theme: next });
          store({ theme: next });
        },
        setLook: (next) => {
          // Keeps the current theme on screen until the new one's fonts are in, so no frame falls back.
          loadFonts(THEMES[next].day)
            .catch(() => undefined)
            .then(() => setStored((current) => current && { ...current, look: next }));
          store({ look: next });
        },
        setPlayful: (next) => {
          setStored((current) => current && { ...current, playful: next });
          store({ playful: next });
        },
      },
    [stored, scheme, look],
  );

  if (!theme) return null;
  return (
    <ThemeContext.Provider value={theme}>
      <View style={variablesFor(look)} className="flex-1 bg-bg">
        <StatusBar style={scheme === 'night' ? 'light' : 'dark'} />
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

/**
 * Re-applies the theme's CSS variables. A React Native Modal renders into a portal outside the
 * provider's View on web, so without this its `bg-surface`, `rounded-card`… resolve to nothing.
 */
export function ThemeScope({ className, children }: { className?: string; children: ReactNode }) {
  const { look, scheme } = useTheme();
  return (
    <View style={variablesFor(THEMES[look][scheme])} className={className}>
      {children}
    </View>
  );
}

/** Draws its children in another theme's look (the Theme picker's cards). */
export function LookScope({ look, className, children }: { look: Look; className?: string; children: ReactNode }) {
  return (
    <View style={variablesFor(look)} className={className}>
      {children}
    </View>
  );
}

/** Stack screens paint their own background (white by default) under each screen. */
export function useStackOptions() {
  const { palette } = useTheme();
  return { headerShown: false, contentStyle: { backgroundColor: palette.bg } };
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme outside ThemeProvider');
  return theme;
}

/** The labels the chosen theme renames, or the plain ones with Playful labels off. Never for screen readers. */
export function useCopy(): Copy {
  const { look, playful } = useTheme();
  return copyFor(look, playful);
}
