import { arcPath, ringAngle, ringPoint, RING, sleepStroke, type DayWindow, type EntriesByKind } from '@molly/core';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { Glyph } from '@/theme/Glyph';
import { useTheme } from '@/theme/theme';

import type { RingSleep } from './model';

/** The design's mini ring: the main ring's geometry with a wider track, drawn into 168 px. */
const SIZE = 168;
const TRACK = 34;
const DOT_RADIUS = RING.trackRadius + TRACK / 2 + 22;

/**
 * A finished (or the live) day or night for Recent days (design `1k`): sleeps on the track, every other
 * entry as a dot outside it, a sun or moon at the top, and the slept total with its count in the middle.
 */
export function MiniRing({
  window,
  sleeps,
  entries,
  big,
  small,
}: {
  window: DayWindow;
  sleeps: RingSleep[];
  entries: EntriesByKind;
  big: string;
  small: string;
}) {
  const { palette } = useTheme();
  const night = window.kind === 'night';
  const inside = (time: string) => Date.parse(time) >= window.start.getTime() && Date.parse(time) < window.end.getTime();
  const dots = [
    ...entries.feeding.filter((entry) => inside(entry.start)).map((entry) => ({ key: `f${entry.id}`, at: entry.start, colour: palette['feed-mid'] })),
    ...entries.change.filter((entry) => inside(entry.time)).map((entry) => ({ key: `c${entry.id}`, at: entry.time, colour: palette['diaper-mid'] })),
    ...entries.medication.filter((entry) => inside(entry.time)).map((entry) => ({ key: `m${entry.id}`, at: entry.time, colour: palette['med-mid'] })),
  ];
  const cap = ringPoint(0, DOT_RADIUS);
  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Svg width={SIZE} height={SIZE} viewBox="-10 -10 420 420" style={{ position: 'absolute' }}>
        <Path d={arcPath(RING.start, RING.start + RING.sweep, RING.trackRadius)} stroke={palette.track} strokeWidth={TRACK} strokeLinecap="round" fill="none" />
        {sleeps.map((sleep) => {
          const stroke = sleepStroke(ringAngle(window, sleep.start), ringAngle(window, sleep.end), TRACK);
          return (
            <Path
              key={sleep.key}
              d={arcPath(stroke.from, stroke.to, RING.trackRadius)}
              stroke={sleep.running ? palette['sleep-ink'] : palette['sleep-mid']}
              strokeWidth={TRACK}
              strokeLinecap={stroke.cap}
              fill="none"
            />
          );
        })}
        {dots.map((dot) => {
          const point = ringPoint(ringAngle(window, new Date(dot.at)), DOT_RADIUS);
          return <Circle key={dot.key} cx={point.x} cy={point.y} r={11} fill={dot.colour} />;
        })}
        <Circle cx={cap.x} cy={cap.y} r={14} fill={night ? palette['sleep-mid'] : palette['med-mid']} />
      </Svg>
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <Glyph name={night ? 'bedtime' : 'wb_sunny'} filled size={18} color={night ? 'sleep-ink' : 'med-ink'} />
        <Text maxFontSizeMultiplier={1.2} className="text-title font-display tabular-nums">
          {big}
        </Text>
        <Text maxFontSizeMultiplier={1.2} className="text-[11px] font-bold text-muted">
          {small}
        </Text>
      </View>
    </View>
  );
}
