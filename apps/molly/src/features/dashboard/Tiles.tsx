import { durationText, timerText, type NeedKind } from '@molly/core';
import { View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Text } from '@/components/ui';
import { spokenDuration } from '@/lib/time';
import { NeedBar } from '@/features/needs/NeedBar';
import type { NeedsView } from '@/features/needs/use-needs';
import { Glyph } from '@/theme/Glyph';
import { needTone } from '@/theme/need-look';
import { TrackerIcon } from '@/theme/TrackerIcon';
import { Icon, useHasIcons } from '@/theme/Icon';
import type { FilledSymbol } from '@/theme/symbols';
import { useTheme } from '@/theme/theme';
import type { IconSlot } from '@/theme/themes';
import type { Palette } from '@/theme/tokens';

import { SubtitleSkeleton } from './Skeleton';
import { useNow } from './use-now';

export type TileKind = 'sleep' | 'feed' | 'diaper' | 'med';

export type TileState = {
  /** The tile's name in the theme's words, and the plain one for screen readers. */
  name: string;
  spoken: string;
  /** The latest entry's time (a sleep's or feed's end) and a detail (`Left`); null when there's none yet. */
  last: { at: string; detail?: string } | null | undefined;
  /** The running timer's start: the tile turns into its Stop button. Undefined until the timers are loaded. */
  runningSince?: string | null;
  /** `Stop sleep` / `Stop feed`, in the theme's words, and the plain words for screen readers. */
  stopName?: string;
  spokenStop?: string;
  onPress: () => void;
};

const COLOURS: Record<TileKind, { bg: string; solid: string; ink: string; onSolid: string; ink_: keyof Palette; bg_: keyof Palette }> = {
  sleep: { bg: 'bg-sleep-bg', solid: 'bg-sleep-ink', ink: 'text-sleep-ink', onSolid: 'text-sleep-bg', ink_: 'sleep-ink', bg_: 'sleep-bg' },
  feed: { bg: 'bg-feed-bg', solid: 'bg-feed-ink', ink: 'text-feed-ink', onSolid: 'text-feed-bg', ink_: 'feed-ink', bg_: 'feed-bg' },
  diaper: { bg: 'bg-diaper-bg', solid: 'bg-diaper-ink', ink: 'text-diaper-ink', onSolid: 'text-diaper-bg', ink_: 'diaper-ink', bg_: 'diaper-bg' },
  med: { bg: 'bg-med-bg', solid: 'bg-med-ink', ink: 'text-med-ink', onSolid: 'text-med-bg', ink_: 'med-ink', bg_: 'med-bg' },
};

/** The tiles' text grows this much at most with the system font size: four of them share the screen's width. */
const MAX_SCALE = 1.4;

/** How long since the last one, always as a length (a tile is read at a glance): `just now`, `2h 39m ago`. */
const sinceText = (ms: number) => (ms < 60_000 ? 'just now' : `${durationText(ms)} ago`);

const GLYPHS: Record<TileKind, FilledSymbol> = { sleep: 'bedtime', feed: 'breastfeeding', diaper: 'baby_changing_station', med: 'medication' };

const NEED_OF: Record<TileKind, NeedKind> = { sleep: 'sleep', feed: 'feed', diaper: 'diaper', med: 'medicine' };

/**
 * The 2 × 2 tiles under the ring: Sleep and Feed start (or stop) their timers, Diaper and Medicine open a
 * picker. With Life Sim's `needs`, each draws its need: a coloured circle, the level's words and a bar.
 */
export function Tiles({ tiles, busy, skeleton, needs }: { tiles: Record<TileKind, TileState>; busy: boolean; skeleton: boolean; needs: NeedsView | null }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {(['sleep', 'feed', 'diaper', 'med'] as const).map((kind) =>
        needs ? (
          <NeedTile key={kind} kind={kind} tile={tiles[kind]} busy={busy} skeleton={skeleton} needs={needs} />
        ) : (
          <Tile key={kind} kind={kind} tile={tiles[kind]} busy={busy} skeleton={skeleton} />
        ),
      )}
    </View>
  );
}

/** The tile's subtitle: a running timer, how long since the last one, or `not yet`; undefined while loading. */
function subtitle(tile: TileState, now: Date, since: (ms: number) => string): string | undefined {
  if (tile.runningSince) return timerText(now.getTime() - Date.parse(tile.runningSince));
  if (tile.last === undefined) return undefined;
  if (!tile.last) return 'not yet';
  return [since(now.getTime() - Date.parse(tile.last.at)), tile.last.detail].filter(Boolean).join(' · ');
}

/** What a tile says to screen readers: the needs layer adds nothing to it. */
function tileLabel(tile: TileState, now: Date, unknown: boolean): string {
  if (unknown) return tile.name;
  if (tile.runningSince) return `${tile.spokenStop ?? tile.stopName}, ${spokenDuration(now.getTime() - Date.parse(tile.runningSince))}`;
  return tile.spoken;
}

function Tile({ kind, tile, busy, skeleton }: { kind: TileKind; tile: TileState; busy: boolean; skeleton: boolean }) {
  const now = useNow(tile.runningSince ? 1000 : undefined);
  const pictured = useHasIcons();
  const { palette } = useTheme();
  const colours = COLOURS[kind];
  const running = !!tile.runningSince;
  const sub = subtitle(tile, now, sinceText);
  const name = running ? tile.stopName! : tile.name;
  // Start or Stop depends on whether its timer runs, so a timer tile waits until that's known.
  const unknown = tile.stopName !== undefined && tile.runningSince === undefined;
  const ink = running ? colours.bg_ : colours.ink_;
  return (
    <Pressable
      accessibilityRole="button"
      // Minutes, not the ticking seconds: TalkBack would read a label that changes every second again and again.
      accessibilityLabel={tileLabel(tile, now, unknown)}
      accessibilityHint={running ? undefined : sub}
      testID={unknown ? `skeleton-${kind}` : undefined}
      logName={name}
      disabled={busy || unknown}
      onPress={tile.onPress}
      className={`min-h-[76px] basis-[48%] grow flex-row items-center gap-3 rounded-card px-3.5 py-2 shadow-card active:scale-[0.97] ${running ? colours.solid : colours.bg}`}
    >
      {running ? (
        <Glyph name="stop_circle" filled size={30} color={ink} />
      ) : pictured ? (
        <Icon slot={kind as IconSlot} color={palette[ink]} size={30} />
      ) : (
        <TrackerIcon name={GLYPHS[kind]} size={30} color={ink} light={colours.bg_} />
      )}
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE} className={`text-title font-display ${running ? colours.onSolid : colours.ink}`}>
          {name}
        </Text>
        {sub !== undefined ? (
          <Text numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE} className={`text-caption font-bold tabular-nums opacity-85 ${running ? colours.onSolid : colours.ink}`}>
            {sub}
          </Text>
        ) : (
          skeleton && <SubtitleSkeleton tone={kind} />
        )}
      </View>
    </Pressable>
  );
}

/** Life Sim's `sinceText`: the design's tiles drop the `ago`. */
const sinceShort = (ms: number) => (ms < 60_000 ? 'just now' : durationText(ms));

/**
 * Life Sim's tile (design "Molly Sim App" `tile()`): a surface card with the icon in a need-coloured circle,
 * the name and time since, the level's words in the need's ink and its bar; a running timer's card is solid
 * in the tracker's ink. A need that isn't measured (nothing logged, Medicine without the Vitamin D reminder)
 * shows no words or bar, its circle in the tracker's colours.
 */
function NeedTile({ kind, tile, busy, skeleton, needs }: { kind: TileKind; tile: TileState; busy: boolean; skeleton: boolean; needs: NeedsView }) {
  const now = useNow(tile.runningSince ? 1000 : undefined);
  const { palette } = useTheme();
  const colours = COLOURS[kind];
  const running = !!tile.runningSince;
  const sub = subtitle(tile, now, sinceShort);
  const name = running ? tile.stopName! : tile.name;
  const unknown = tile.stopName !== undefined && tile.runningSince === undefined;
  const need = needs.needs[NEED_OF[kind]];
  const tone = need && needTone(needs.look, need.value);
  const words = needs.look.words;
  const label = need && needs.words ? (need.running ? words.running : words.levels[NEED_OF[kind]][need.level]) : null;
  const onCard = running ? colours.onSolid : 'text-ink';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tileLabel(tile, now, unknown)}
      accessibilityHint={running ? undefined : sub}
      testID={unknown ? `skeleton-${kind}` : undefined}
      logName={name}
      disabled={busy || unknown}
      onPress={tile.onPress}
      className={`min-h-[86px] basis-[48%] grow justify-center gap-[5px] rounded-card px-3 py-2 shadow-card active:scale-[0.97] ${running ? colours.solid : 'border-card border-edge bg-surface'}`}
    >
      <View className="flex-row items-center gap-[7px]">
        <View className="h-[26px] w-[26px] items-center justify-center rounded-full" style={{ backgroundColor: tone ? tone.color : palette[colours.bg_] }}>
          <Glyph name={GLYPHS[kind]} filled size={17} color={tone ? (needs.look.face as `#${string}`) : colours.ink_} />
        </View>
        {/* The name keeps its room; a long time since (`36h 33m · Left`) is cut off instead. */}
        <Text numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE} className={`shrink-0 text-title font-display ${onCard}`}>
          {name}
        </Text>
        {sub !== undefined ? (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={MAX_SCALE}
            className={`min-w-0 flex-1 text-right text-caption font-extrabold tabular-nums ${running ? colours.onSolid : 'text-muted'}`}
          >
            {sub}
          </Text>
        ) : (
          skeleton && <SubtitleSkeleton tone={kind} />
        )}
      </View>
      {label !== null && (
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={MAX_SCALE}
          className={`text-xs font-black ${running ? colours.onSolid : ''}`}
          style={running ? undefined : { color: tone!.ink }}
        >
          {label}
        </Text>
      )}
      {need && <NeedBar need={need} look={needs.look} testID={`need-bar-${kind}`} />}
    </Pressable>
  );
}
