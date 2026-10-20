import {
  arcPath,
  hourTicks,
  markTap,
  placeMarks,
  RING,
  ringAngle,
  ringPoint,
  sleepStroke,
  sleepLabels,
  type CentreText,
  type DayWindow,
} from '@molly/core';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Pressable } from '@/components/pressable';
import { Text } from '@/components/ui';
import { useNow } from '@/features/dashboard/use-now';
import { MOOD_PILL, MoodPill } from '@/features/needs/MoodPill';
import type { NeedsView } from '@/features/needs/use-needs';
import { WANTS_BOX, WantsBubble } from '@/features/needs/WantsBubble';
import { Bow, bowKnot, useOrnaments } from '@/theme/Bow';
import { Glyph } from '@/theme/Glyph';
import { needTone } from '@/theme/need-look';
import { teddySleepy } from '@/theme/ornaments';
import { Teddy } from '@/theme/Teddy';
import { TrackerIcon } from '@/theme/TrackerIcon';
import { useTheme } from '@/theme/theme';
import { THEMES } from '@/theme/themes';
import type { Palette } from '@/theme/tokens';

import type { MarkKind, RingKey, RingLikely, RingMarkItem, RingSleep } from './model';

const { c: C, trackRadius: RS, trackWidth: WS, markRadius: RM, markSize: MS, labelRadius: RL, sleepLabelRadius: RT, capY: CAP_Y } = RING;
/** The design draws in a 400 px box; smaller screens get the same ring scaled down. */
export const RING_BOX = 400;
/** What a faded part keeps while something else is selected. */
const FADED = 0.25;
/** Ribbon's ornaments in the ring (design `Molly Ribbon App`): the bow at the top, its cap and the teddy, px. */
const BOW = 84;
const KNOT_CAP = 32;
const TEDDY = { size: 62, inset: 4, tilt: 6, faded: 0.4 };
/** Text inside the ring grows this much at most with the system font size, so it stays inside. */
const MAX_FONT_SCALE = 1.2;

const MARK_COLOURS: Record<MarkKind, { bg: keyof Palette; mid: keyof Palette; ink: keyof Palette }> = {
  feed: { bg: 'feed-bg', mid: 'feed-mid', ink: 'feed-ink' },
  diaper: { bg: 'diaper-bg', mid: 'diaper-mid', ink: 'diaper-ink' },
  med: { bg: 'med-bg', mid: 'med-mid', ink: 'med-ink' },
};

const CENTRE_TONE = { muted: 'text-muted', sleep: 'text-sleep-ink', feed: 'text-feed-ink' } as const;

export type RingProps = {
  window: DayWindow;
  /** The live window: the now hand. */
  live: boolean;
  now: Date;
  sleeps: RingSleep[];
  marks: RingMarkItem[];
  /** The plan's likely sleeps (live day). A tap selects one, as it does an entry. */
  ghosts: RingLikely[];
  /**
   * The words in the middle at a moment: worked out every second by the centre alone, not the whole ring.
   * `spoken`: what TalkBack reads instead of a ticking `big` (minutes, not seconds).
   */
  centre: (now: Date) => CentreText & { spoken?: string };
  /** `Day started 07:13` / `Bedtime 19:05` beside the cap, or null. */
  startLabel: string | null;
  /** Spoken: where the cap goes ("Switch to last night"). */
  capLabel: string;
  onCap: () => void;
  selected: RingKey | null;
  onSelect: (key: RingKey) => void;
  /** Life Sim's needs (null in every other theme): the mood pill, the Wants bubble and the mood chip, on the live window. */
  needs?: NeedsView | null;
};

/** The window start's label sits above the cap, out of the marks' way; its line is kept even when empty, so the ring never moves. */
const START_LABEL_SPACE = 22;

/** The design's clock ring of one day or night, scaled to the space it's given (at most 400 px). */
export function Ring(props: RingProps) {
  const [size, setSize] = useState(0);
  const night = props.window.kind === 'night';
  return (
    <View
      className="flex-1 items-center justify-center"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize(Math.min(RING_BOX, width, height - START_LABEL_SPACE));
      }}
    >
      {size > 0 && (
        <Text
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          numberOfLines={1}
          className={`text-caption font-display tabular-nums ${night ? 'text-sleep-ink' : 'text-med-ink'}`}
          style={{ height: START_LABEL_SPACE, lineHeight: START_LABEL_SPACE }}
        >
          {props.startLabel ?? ''}
        </Text>
      )}
      {size > 0 && (
        <View style={{ width: size, height: size }}>
          <View
            style={{
              position: 'absolute',
              width: RING_BOX,
              height: RING_BOX,
              left: (size - RING_BOX) / 2,
              top: (size - RING_BOX) / 2,
              transform: [{ scale: size / RING_BOX }],
            }}
          >
            <RingBox {...props} />
          </View>
        </View>
      )}
    </View>
  );
}

function RingBox({ window, live, now, sleeps, marks, ghosts, centre, startLabel, capLabel, onCap, selected, onSelect, needs = null }: RingProps) {
  const { palette, look, scheme } = useTheme();
  const ornaments = useOrnaments();
  const stitch = THEMES[look][scheme].stitch;
  const angle = (time: Date) => ringAngle(window, time);
  const opacity = (key: RingKey) => (selected === null || selected === key ? 1 : FADED);
  const night = window.kind === 'night';
  const placed = placeMarks(window, marks);
  const hand = live ? ringPoint(angle(now), RS - WS / 2 - 26) : null;
  const handEnd = live ? ringPoint(angle(now), RS + WS / 2 + 4) : null;
  const startTick = startLabel ? [ringPoint(angle(window.start), RS - WS / 2 - 4), ringPoint(angle(window.start), RS + WS / 2 + 10)] : null;
  // The selected likely sleep stays as it is (and fills); the others fade as they do for a selected entry.
  const ghostOpacity = (key: RingKey) => (selected === null || selected === key ? 1 : 0.3);
  const markOpacity = (mark: (typeof placed)[number]) => (mark.live ? (selected === null ? 1 : FADED) : opacity(mark.key));
  // Life Sim's layer, on the live window only: it's about now. Dimmed like the teddy while something is selected.
  const sim = live ? needs : null;
  const pill = sim?.mood ? sim : null;
  const decoration = selected === null ? 1 : TEDDY.faded;
  return (
    <>
      <Svg width={RING_BOX} height={RING_BOX} viewBox={`0 0 ${RING_BOX} ${RING_BOX}`} style={{ position: 'absolute' }}>
        <Path d={arcPath(RING.start, RING.start + RING.sweep, RS)} stroke={palette.track} strokeWidth={WS} strokeLinecap="round" fill="none" />
        {hourTicks(window).map((tick) => {
          const [a, b] = [ringPoint(tick, RS - WS / 2 - 8), ringPoint(tick, RS - WS / 2 - 3)];
          return <Line key={tick} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={palette.line} strokeWidth={2} strokeLinecap="round" />;
        })}
        {ghosts.map((ghost) => (
          <Ghost key={ghost.key} ghost={ghost} palette={palette} opacity={ghostOpacity(ghost.key)} selected={selected === ghost.key} />
        ))}
        {sleeps.map((sleep) => {
          const stroke = sleepStroke(angle(sleep.start), angle(sleep.end));
          return (
            <Path
              key={sleep.key}
              d={arcPath(stroke.from, stroke.to, RS)}
              stroke={sleep.running ? palette['sleep-ink'] : palette['sleep-mid']}
              strokeWidth={WS}
              strokeLinecap={stroke.cap}
              fill="none"
              opacity={opacity(sleep.key)}
            />
          );
        })}
        {stitch && (
          <Path
            d={arcPath(RING.start + 2, RING.start + RING.sweep - 2, RS)}
            stroke={stitch}
            strokeWidth={1.5}
            strokeDasharray="5 5"
            opacity={0.9}
            fill="none"
          />
        )}
        {ghosts.map((ghost) => (
          <Path
            key={`${ghost.key}-hit`}
            d={arcPath(ghost.from, ghost.to, RS)}
            stroke="transparent"
            strokeWidth={RING.hitWidth}
            fill="none"
            onPress={() => onSelect(ghost.key)}
          />
        ))}
        {sleeps.map((sleep) => (
          <Path
            key={`${sleep.key}-hit`}
            d={arcPath(angle(sleep.start), angle(sleep.end), RS)}
            stroke="transparent"
            strokeWidth={RING.hitWidth}
            fill="none"
            onPress={() => onSelect(sleep.key)}
          />
        ))}
        {startTick && (
          <Line
            x1={startTick[0]!.x}
            y1={startTick[0]!.y}
            x2={startTick[1]!.x}
            y2={startTick[1]!.y}
            stroke={night ? palette['sleep-ink'] : palette['med-ink']}
            strokeWidth={3}
            strokeLinecap="round"
          />
        )}
        {/* Each mark's line straight in to the track at its time. */}
        {placed.map((mark) => {
          const [a, b] = [ringPoint(mark.angle, RS + WS / 2 + 2), ringPoint(mark.angle, RM - MS / 2 - 1)];
          return (
            <Line
              key={`${mark.key}-line`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={palette[MARK_COLOURS[mark.kind].mid]}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={markOpacity(mark)}
            />
          );
        })}
        {hand && handEnd && (
          <>
            <Line x1={hand.x} y1={hand.y} x2={handEnd.x} y2={handEnd.y} stroke={palette.ink} strokeWidth={3} strokeLinecap="round" />
            <Circle cx={hand.x} cy={hand.y} r={5} fill={palette.ink} />
          </>
        )}
      </Svg>

      {ornaments && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: TEDDY.inset, top: RING_BOX - TEDDY.inset - TEDDY.size, opacity: selected === null ? 1 : TEDDY.faded }}
        >
          <Teddy size={TEDDY.size} colors={ornaments.teddy} bow={ornaments.bow} sleepy={teddySleepy(sleeps)} tilt={TEDDY.tilt} />
        </View>
      )}

      {sim && (
        <View style={{ position: 'absolute', left: WANTS_BOX.inset, top: RING_BOX - WANTS_BOX.inset - WANTS_BOX.size }}>
          <WantsBubble needs={sim} opacity={decoration} />
        </View>
      )}

      {/* Screen readers and keyboards reach each sleep through a button at its middle; the arc itself takes taps too. */}
      {sleeps.map((sleep) => {
        const middle = ringPoint((angle(sleep.start) + angle(sleep.end)) / 2, RS);
        return (
          <Pressable
            key={`${sleep.key}-button`}
            accessibilityRole="button"
            accessibilityLabel={sleep.spoken}
            onPress={() => onSelect(sleep.key)}
            hitSlop={2}
            style={{ position: 'absolute', left: middle.x - 22, top: middle.y - 22, width: 44, height: 44 }}
          />
        );
      })}

      {ghosts.map((ghost) => {
        const middle = ringPoint((ghost.from + ghost.to) / 2, RS);
        return (
          <Pressable
            key={`${ghost.key}-button`}
            accessibilityRole="button"
            accessibilityLabel={ghost.spoken}
            aria-expanded={selected === ghost.key}
            onPress={() => onSelect(ghost.key)}
            hitSlop={2}
            style={{ position: 'absolute', left: middle.x - 22, top: middle.y - 22, width: 44, height: 44 }}
          />
        );
      })}

      {/* Labels never take a tap: the arcs and marks under them do. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: RING_BOX, height: RING_BOX }}>
        {ghosts.flatMap((ghost) =>
          ghost.labels.map((label) => {
            const point = ringPoint(label.angle, RL);
            return (
              <Text
                key={`${ghost.key}-${label.text}`}
                aria-hidden
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                numberOfLines={1}
                className={`absolute w-[90px] text-center text-caption font-display tabular-nums ${ghost.next ? 'text-sleep-ink' : 'text-muted'}`}
                style={{ left: point.x - 45, top: point.y - 9, lineHeight: 18, opacity: ghostOpacity(ghost.key) }}
              >
                {label.text}
              </Text>
            );
          }),
        )}

        {/* Each sleep's start and end, inside the track: where the day is, read against the naps. */}
        {sleepLabels(window, sleeps).map((label) => {
          const point = ringPoint(label.angle, RT);
          return (
            <Text
              key={`${label.key}-${label.text}`}
              aria-hidden
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              numberOfLines={1}
              className="absolute w-[100px] text-center text-xs font-extrabold tabular-nums text-sleep-ink"
              style={{ left: point.x - 50, top: point.y - 8, lineHeight: 16, opacity: opacity(label.key) }}
            >
              {label.text}
            </Text>
          );
        })}
      </View>

      {/* The latest on top and the selected one above all, so a second tap on a stack reaches the one under it. */}
      {[...placed.filter((mark) => mark.key !== selected), ...placed.filter((mark) => mark.key === selected)].map((mark) => {
        const point = ringPoint(mark.angle, RM);
        const colours = MARK_COLOURS[mark.kind];
        const ring = mark.live ? colours.mid : selected === mark.key ? 'ink' : null;
        return (
          <Pressable
            key={mark.key}
            accessibilityRole="button"
            accessibilityLabel={mark.spoken}
            onPress={() => onSelect(markTap(placed, mark.key, selected))}
            // 44 px, with slop to Android's 48.
            hitSlop={2}
            style={{ position: 'absolute', left: point.x - 22, top: point.y - 22, width: 44, height: 44, opacity: markOpacity(mark) }}
            className="items-center justify-center active:scale-[0.97]"
          >
            {ring && <View className="absolute h-10 w-10 rounded-full" style={{ backgroundColor: palette[ring] }} />}
            <View className="h-[34px] w-[34px] items-center justify-center rounded-full" style={{ backgroundColor: palette[mark.live ? colours.ink : colours.bg] }}>
              <TrackerIcon
                name={mark.icon}
                kind={mark.kind === 'diaper' ? 'diaper' : undefined}
                size={20}
                ribbonSize={22}
                color={mark.live ? colours.bg : colours.ink}
                light={mark.live ? colours.ink : colours.bg}
              />
            </View>
          </Pressable>
        );
      })}

      {/* The bow is tied round the top, the cap sitting in its knot; the cap stays the tap target. */}
      {ornaments && (
        <View pointerEvents="none" style={{ position: 'absolute', left: C - bowKnot(BOW).x, top: CAP_Y - bowKnot(BOW).y }}>
          <Bow size={BOW} color={ornaments.bow.color} shade={ornaments.bow.shade} />
        </View>
      )}
      {pill && (
        <View pointerEvents="none" style={{ position: 'absolute', left: C - MOOD_PILL.width / 2, top: CAP_Y - MOOD_PILL.height / 2 }}>
          <MoodPill needs={pill} night={night} opacity={decoration} />
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={capLabel}
        onPress={onCap}
        // Over the whole mood pill in Life Sim: its cap is inside it.
        style={{ position: 'absolute', left: C - (pill ? MOOD_PILL.width / 2 : 26), top: CAP_Y - 26, width: pill ? MOOD_PILL.width : 52, height: 52 }}
        className="items-center justify-center active:scale-[0.97]"
      >
        {pill ? null : ornaments ? (
          <View
            className="items-center justify-center rounded-full bg-surface"
            // oklch(0.3 0.08 5 / .35)
            style={{ width: KNOT_CAP, height: KNOT_CAP, boxShadow: '0 1px 3px #4d192859' }}
          >
            <Glyph name={night ? 'bedtime' : 'wb_sunny'} filled size={19} color={night ? 'sleep-ink' : 'med-ink'} />
          </View>
        ) : (
          <View className={`h-10 w-10 items-center justify-center rounded-full ${night ? 'bg-sleep-bg' : 'bg-med-bg'}`}>
            <Glyph name={night ? 'bedtime' : 'wb_sunny'} filled size={22} color={night ? 'sleep-ink' : 'med-ink'} />
          </View>
        )}
      </Pressable>

      <Centre of={centre} needs={sim} />
    </>
  );
}

/**
 * The ring's middle, the only part that ticks every second. With Life Sim's needs (Playful labels on): the
 * mood's word as a chip under it, and `Way past nap time` in the need's ink once the sleep need is empty.
 */
function Centre({ of, needs }: { of: RingProps['centre']; needs: NeedsView | null }) {
  const centre = of(useNow(1000));
  const words = needs?.words ? needs : null;
  const sleep = words?.needs.sleep;
  const pastNap = sleep && !sleep.running && !words.needs.feed?.running && sleep.value <= 0;
  const chip = words?.mood ? { text: words.look.words.moods[words.mood.mood], color: needTone(words.look, words.mood.value).color } : null;
  return (
    <View
      accessible
      accessibilityLabel={`${centre.label} ${centre.spoken ?? centre.big}, ${centre.sub}`}
      pointerEvents="none"
      className="absolute items-center justify-center"
      // The inside of the track is 234 px across: 200 px of text fits with room to spare.
      style={{ left: 100, right: 100, top: 140, bottom: 140 }}
    >
      <Text
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        numberOfLines={1}
        className={`text-sm font-extrabold ${pastNap ? '' : CENTRE_TONE[centre.tone]}`}
        style={pastNap ? { color: needTone(words.look, 0).ink } : undefined}
      >
        {pastNap ? words.look.words.pastNap : centre.label}
      </Text>
      <Text
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        numberOfLines={1}
        className="text-center text-[34px] font-display leading-[40px] tracking-display-0_8 tabular-nums"
      >
        {centre.big}
      </Text>
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1} className="text-center text-caption font-bold text-muted">
        {centre.sub}
      </Text>
      {chip && (
        <View aria-hidden className="mt-1.5 rounded-[11px] px-2.5 py-[3px]" style={{ backgroundColor: chip.color }}>
          <Text maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={1} className="text-xs font-black tracking-[0.4px]" style={{ color: words!.look.face }}>
            {chip.text}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * A likely sleep: dashed edges along the track and across its ends, filled when it's the next one, and in the
 * sleeps' colour while its panel is open (`selected`).
 */
function Ghost({ ghost, palette, opacity, selected }: { ghost: RingLikely; palette: Palette; opacity: number; selected: boolean }) {
  const edge = { stroke: palette['sleep-mid'], strokeWidth: 2, strokeDasharray: '4 4', fill: 'none', opacity: ghost.next || selected ? opacity : opacity * 0.7 };
  const ends = [ghost.from, ghost.to].map((angle) => [ringPoint(angle, RS - WS / 2), ringPoint(angle, RS + WS / 2)] as const);
  return (
    <>
      {(ghost.next || selected) && (
        <Path d={arcPath(ghost.from, ghost.to, RS)} stroke={palette[selected ? 'sleep-mid' : 'sleep-bg']} strokeWidth={WS} fill="none" opacity={opacity} />
      )}
      <Path d={arcPath(ghost.from, ghost.to, RS - WS / 2 + 1)} {...edge} />
      <Path d={arcPath(ghost.from, ghost.to, RS + WS / 2 - 1)} {...edge} />
      {ends.map(([a, b], index) => (
        <Line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...edge} />
      ))}
    </>
  );
}
