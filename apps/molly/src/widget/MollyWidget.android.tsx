'use no memo';

import type { ReactNode } from 'react';
import { FlexWidget, SvgWidget, TextWidget, type ColorProp, type WidgetRepresentation } from 'react-native-android-widget';

import type { Settings } from '@/storage/types';
import { PLAIN, spoken, type Copy } from '@/theme/copy';
import { iconSvg } from '@/theme/icons';
import { THEMES, type IconSlot, type Look, type WidgetWeight } from '@/theme/themes';
import { CHILD_COLOURS, type Palette, type Tracker } from '@/theme/tokens';

import {
  WIDGET_NAMES,
  widgetLayout,
  widgetThemes,
  type PendingView,
  type RowView,
  type WidgetIntent,
  type WidgetLayout,
  type WidgetName,
  type WidgetTheme,
  type WidgetView,
} from './model';

/** What every part of a widget draws with: the theme's colours, labels, font files and corners. */
type Draw = {
  p: Palette;
  c: Copy;
  fonts: Look['widget']['fonts'];
  radius: Look['widget']['radius'];
  displayWeight: string;
  icons: Look['icons'];
  /** The four child colours in this half's scheme, for the badge. */
  kids: { bg: string; ink: string }[];
};

const drawWith = ({ look, copy }: WidgetTheme): Draw => ({
  p: look.palette,
  c: copy,
  fonts: look.widget.fonts,
  radius: look.widget.radius,
  displayWeight: look.fonts.displayWeight,
  icons: look.icons,
  kids: CHILD_COLOURS[Object.values(THEMES).some((theme) => theme.night === look) ? 'night' : 'day'],
});

type Ready = Extract<WidgetView, { type: 'ready' }>;
/** `icon`: the theme's picture beside the label, if it has pictures. */
type Button = { label: string; intent: WidgetIntent; name: string; icon?: IconSlot };

const color = (hex: string) => hex as ColorProp;

/**
 * A widget can't spin or fade: a tap on its way shows as its label and a see-through fill. The tapped button
 * keeps enough of its fill for the pending label to read; the row's other buttons fade further.
 */
const PENDING_ALPHA = { tapped: 0.7, others: 0.4 };

/** `#rrggbb` at `alpha`. */
function faded(hex: string, alpha: number): ColorProp {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** `display`: the theme's display face (the big numbers), else its body face in `weight`. */
function Label({
  w,
  text,
  size,
  weight = 800,
  tint,
  display,
}: {
  w: Draw;
  text: string;
  size: number;
  weight?: WidgetWeight;
  tint: string;
  display?: boolean;
}) {
  const font = display
    ? { fontFamily: w.fonts.display, fontWeight: w.displayWeight as '800' }
    : { fontFamily: w.fonts.body[weight].file, fontWeight: w.fonts.body[weight].weight as '800' };
  return <TextWidget text={text} maxLines={1} truncate="END" style={{ fontSize: size, ...font, color: color(tint) }} />;
}

/**
 * `title` names the buttons for screen readers: the plain words. `pending`: the row's tap on its way; the buttons
 * keep their click actions (the task handler drops taps while it's fresh), since a widget can't redraw itself
 * when a pending tap from a killed task expires.
 */
function Buttons({
  buttons,
  tracker,
  w,
  height = 40,
  title,
  pending,
}: {
  buttons: Button[];
  tracker: Tracker;
  w: Draw;
  height?: number;
  title: string;
  pending: PendingView | null;
}) {
  const ink = w.p[`${tracker}-ink`];
  return (
    <FlexWidget style={{ flexDirection: 'row', flexGap: 4, width: 'match_parent' }}>
      {buttons.map((button) => {
        const tapped = pending?.intent === button.intent;
        const label = tapped ? pending.label : button.label;
        const fill = !pending ? color(ink) : faded(ink, tapped ? PENDING_ALPHA.tapped : PENDING_ALPHA.others);
        return (
          <FlexWidget
            key={button.intent}
            clickAction={button.intent}
            accessibilityLabel={`${title}: ${tapped ? label : button.name}`}
            style={{
              flex: 1,
              height,
              borderRadius: w.radius.button,
              backgroundColor: fill,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 3 }}>
              {button.icon && w.icons ? (
                <SvgWidget svg={iconSvg(w.icons[button.icon], w.p[`${tracker}-bg`], 16)} style={{ width: 16, height: 16 }} />
              ) : null}
              {/* Smaller while pending: `Stopping…` has to fit where `Stop` did. */}
              <Label w={w} text={label} size={tapped ? 12 : 13} weight={900} tint={w.p[`${tracker}-bg`]} />
            </FlexWidget>
          </FlexWidget>
        );
      })}
    </FlexWidget>
  );
}

const SLEEP_START: Button = { label: 'Start', intent: 'SLEEP_START', name: 'Start', icon: 'sleep' };
const SLEEP_STOP: Button = { label: 'Stop', intent: 'SLEEP_STOP', name: 'Stop', icon: 'sleep' };
const FEED_START: Button = { label: 'Start', intent: 'FEED_START', name: 'Start', icon: 'feed' };
const LEFT: Button = { label: 'Left', intent: 'FEED_STOP_LEFT', name: 'Left' };
const RIGHT: Button = { label: 'Right', intent: 'FEED_STOP_RIGHT', name: 'Right' };
const BOTH: Button = { label: 'Both', intent: 'FEED_STOP_BOTH', name: 'Both breasts' };
const BOTTLE: Button = { label: 'Bottle', intent: 'FEED_STOP_BOTTLE', name: 'Bottle' };
/** Time feeds off: the same sides, each saving a finished feed at once (Bottle at the last bottle's amount). */
const LOG_LEFT: Button = { label: 'Left', intent: 'FEED_LOG_LEFT', name: 'Save left feed' };
const LOG_RIGHT: Button = { label: 'Right', intent: 'FEED_LOG_RIGHT', name: 'Save right feed' };
const LOG_BOTH: Button = { label: 'Both', intent: 'FEED_LOG_BOTH', name: 'Save feed from both breasts' };
const LOG_BOTTLE: Button = { label: 'Bottle', intent: 'FEED_LOG_BOTTLE', name: 'Save bottle' };
/** An idle feed row's buttons: Start, or the sides that save at once. */
const idleFeed = (feeding: Ready['feeding'], start: Button = FEED_START): Button[] =>
  feeding.instant ? [LOG_LEFT, LOG_RIGHT, LOG_BOTTLE] : [start];
/** The diaper buttons in the theme's words; screen readers get the plain ones. */
const diapers = (c: Copy): Button[] => [
  { label: c.wet, intent: 'DIAPER_WET', name: PLAIN.wet, icon: 'wet' },
  { label: c.dirty, intent: 'DIAPER_DIRTY', name: PLAIN.dirty, icon: 'dirty' },
  { label: c.both, intent: 'DIAPER_BOTH', name: PLAIN.both, icon: 'both' },
];

/** A tracker's title on its own. */
const titles = (c: Copy): Record<Tracker, string> => ({ sleep: c.sleep, feed: c.feedNoun, diaper: c.diaper });
const TITLES = titles(PLAIN);

/** `Sleeping since` / `Feeding since`, in the theme's words. */
const since = (c: Copy, tracker: 'sleep' | 'feed') => `${tracker === 'sleep' ? c.sleeping : c.feeding} since`;

/** The first line under a title: a button's note beats anything else. */
function status(row: RowView, idle: string) {
  if (row.note) return row.note.text;
  if (row.running) return `${row.running.elapsed} at ${row.running.asOf}`;
  return idle;
}

const ago = (row: RowView, suffix: string) => (row.ago ? `${row.ago} ${suffix}` : 'Nothing yet');

/** The sleep row while awake: `Awake 2h 34m · nap 08:55 – 09:25` once a window is likely. */
const awake = (sleep: Ready['sleep']) =>
  sleep.likely && sleep.ago ? `Awake ${sleep.ago} · ${sleep.likely.inline}` : ago(sleep, 'awake');

const IDLE_TEXT: Record<Exclude<WidgetView['type'], 'ready'>, string> = {
  signedOut: 'Open Molly to sign in',
  keyRejected: "Can't sign in · Open Molly",
  loading: 'Loading…',
};

export function MollyWidget({ name, layout, view, w }: { name: WidgetName; layout: WidgetLayout; view: WidgetView; w: Draw }) {
  if (view.type !== 'ready') {
    return (
      <Shell w={w} background={w.p.surface}>
        <FlexWidget clickAction="OPEN_APP" style={{ flex: 1, width: 'match_parent', justifyContent: 'center', alignItems: 'center' }}>
          <Label w={w} text={IDLE_TEXT[view.type]} size={13} weight={700} tint={w.p.muted} />
        </FlexWidget>
      </Shell>
    );
  }
  if (name === 'Molly') {
    if (layout === 'glance') return <Glance view={view} w={w} />;
    if (layout === 'medium') return <Medium view={view} w={w} />;
    return <Full view={view} w={w} />;
  }
  const tracker: Tracker = name === 'Sleep' ? 'sleep' : name === 'Feeding' ? 'feed' : 'diaper';
  if (layout === 'small') return <Small tracker={tracker} view={view} w={w} />;
  if (layout === 'wide') return <Wide tracker={tracker} view={view} w={w} />;
  return <Large tracker={tracker} view={view} w={w} />;
}

function Shell({ w, background, children, padding = 12, open }: { w: Draw; background: string; children: ReactNode; padding?: number; open?: boolean }) {
  return (
    <FlexWidget
      clickAction={open ? 'OPEN_APP' : undefined}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: color(background),
        borderRadius: w.radius.shell,
        padding,
        flexGap: 8,
      }}
    >
      {children}
    </FlexWidget>
  );
}

/**
 * Whose buttons these are, while more than one child is shown: the child's initial on its colour, as in the app.
 * A plain function like `stale`: nothing with one child.
 */
function badge(view: Ready, w: Draw, size = 18) {
  if (!view.badge) return null;
  const tone = w.kids[view.badge.hue % w.kids.length]!;
  return (
    <FlexWidget
      accessibilityLabel={view.badge.name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color(tone.bg),
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Label w={w} text={view.badge.initial} size={Math.round(size * 0.58)} weight={900} tint={tone.ink} />
    </FlexWidget>
  );
}

/** A title with the badge before it, when there is one. */
function titled(view: Ready, w: Draw, title: ReactNode, size?: number) {
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 5 }}>
      {badge(view, w, size)}
      {title}
    </FlexWidget>
  );
}

// A plain function, not a component: the widget renderer can't handle a component that returns null.
function stale(view: Ready, w: Draw) {
  return view.stale ? <Label w={w} text={view.stale} size={11} weight={700} tint={w.p.danger} /> : null;
}

/** Molly 2×1: time since each tracker's last event. */
function Glance({ view, w }: { view: Ready; w: Draw }) {
  const cell = (tracker: Tracker, value: string, label: string) => (
    <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'column', justifyContent: 'space-between' }}>
      <FlexWidget style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color(w.p[`${tracker}-mid`]) }} />
      <FlexWidget style={{ flexDirection: 'column' }}>
        <Label w={w} text={value} size={15} tint={w.p.ink} display />
        <Label w={w} text={label} size={11} weight={700} tint={w.p.muted} />
      </FlexWidget>
    </FlexWidget>
  );
  const { sleep, feeding, diaper } = view;
  return (
    <Shell w={w} background={w.p.surface} open>
      <FlexWidget style={{ flex: 1, width: 'match_parent', flexDirection: 'row', flexGap: 6 }}>
        {badge(view, w, 16)}
        {sleep.running ? cell('sleep', sleep.running.since, 'sleeping since') : cell('sleep', sleep.ago ?? '—', 'awake')}
        {feeding.running ? cell('feed', feeding.running.since, 'feeding since') : cell('feed', feeding.ago ?? '—', 'since fed')}
        {cell('diaper', diaper.ago ?? '—', 'since diaper')}
      </FlexWidget>
      {stale(view, w)}
    </Shell>
  );
}

/** Molly 4×2: the running tracker leads (feeding first), the other two beside it. */
function Medium({ view, w }: { view: Ready; w: Draw }) {
  const { sleep, feeding } = view;
  const sleepLeads = !!sleep.running && !feeding.running;
  const lead = sleepLeads ? (
    <LeadTile
      title={since(w.c, 'sleep')}
      spokenTitle={since(PLAIN, 'sleep')}
      tracker="sleep"
      w={w}
      big={sleep.running!.since}
      sub={status(sleep, '')}
      buttons={[SLEEP_STOP]}
      pending={sleep.pending}
      view={view}
    />
  ) : feeding.running ? (
    <LeadTile
      title={since(w.c, 'feed')}
      spokenTitle={since(PLAIN, 'feed')}
      tracker="feed"
      w={w}
      big={feeding.running.since}
      sub={status(feeding, '')}
      buttons={[LEFT, RIGHT, BOTH, BOTTLE]}
      pending={feeding.pending}
      twoRows
      view={view}
    />
  ) : (
    <LeadTile
      title={feeding.side ? `Last feed · ${feeding.side}` : w.c.feed}
      spokenTitle={feeding.side ? `Last feed · ${feeding.side}` : PLAIN.feed}
      tracker="feed"
      w={w}
      big={feeding.lastAt ?? '—'}
      sub={feeding.note?.text ?? ago(feeding, 'ago')}
      buttons={feeding.instant ? [LOG_LEFT, LOG_RIGHT, LOG_BOTH, LOG_BOTTLE] : [FEED_START]}
      pending={feeding.pending}
      twoRows={feeding.instant}
      view={view}
    />
  );
  return (
    <Shell w={w} background={w.p.surface} padding={10}>
      <FlexWidget style={{ flex: 1, width: 'match_parent', flexDirection: 'row', flexGap: 8 }}>
        {lead}
        <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'column', flexGap: 8 }}>
          {sleepLeads ? (
            <CompactRow
              title={w.c.feed}
              spokenTitle={PLAIN.feed}
              tracker="feed"
              w={w}
              sub={status(feeding, ago(feeding, 'since fed'))}
              buttons={idleFeed(feeding)}
              pending={feeding.pending}
            />
          ) : (
            <CompactRow
              title={w.c.sleep}
              spokenTitle={PLAIN.sleep}
              tracker="sleep"
              w={w}
              sub={status(sleep, awake(sleep))}
              buttons={[sleep.running ? SLEEP_STOP : SLEEP_START]}
              pending={sleep.pending}
            />
          )}
          <CompactRow
            title={w.c.diaper}
            spokenTitle={PLAIN.diaper}
            tracker="diaper"
            w={w}
            sub={status(view.diaper, ago(view.diaper, 'ago'))}
            buttons={diapers(w.c)}
            pending={view.diaper.pending}
            stacked
          />
        </FlexWidget>
      </FlexWidget>
      {stale(view, w)}
    </Shell>
  );
}

function LeadTile({
  title,
  spokenTitle,
  tracker,
  w,
  big,
  sub,
  buttons,
  pending,
  twoRows,
  view,
}: {
  title: string;
  /** The plain title, naming the buttons for screen readers. */
  spokenTitle: string;
  tracker: Tracker;
  w: Draw;
  big: string;
  sub: string;
  buttons: Button[];
  pending: PendingView | null;
  twoRows?: boolean;
  /** For the badge before the title. */
  view: Ready;
}) {
  const ink = w.p[`${tracker}-ink`];
  return (
    <FlexWidget
      style={{
        flex: 1,
        height: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: color(w.p[`${tracker}-bg`]),
        borderRadius: w.radius.tile,
        padding: 10,
      }}
    >
      <FlexWidget clickAction="OPEN_APP" style={{ flexDirection: 'column', width: 'match_parent' }}>
        {titled(view, w, <Label w={w} text={title} size={12} tint={ink} />, 16)}
        <Label w={w} text={big} size={28} tint={ink} display />
        <Label w={w} text={sub} size={11} weight={700} tint={ink} />
      </FlexWidget>
      {twoRows ? (
        <FlexWidget style={{ flexDirection: 'column', flexGap: 4, width: 'match_parent' }}>
          <Buttons buttons={buttons.slice(0, 2)} tracker={tracker} w={w} height={32} title={spokenTitle} pending={pending} />
          <Buttons buttons={buttons.slice(2)} tracker={tracker} w={w} height={32} title={spokenTitle} pending={pending} />
        </FlexWidget>
      ) : (
        <Buttons buttons={buttons} tracker={tracker} w={w} height={36} title={spokenTitle} pending={pending} />
      )}
    </FlexWidget>
  );
}

function CompactRow({
  title,
  spokenTitle,
  tracker,
  w,
  sub,
  buttons,
  pending,
  stacked,
}: {
  title: string;
  /** The plain title, naming the buttons for screen readers. */
  spokenTitle: string;
  tracker: Tracker;
  w: Draw;
  sub: string;
  buttons: Button[];
  pending: PendingView | null;
  stacked?: boolean;
}) {
  const ink = w.p[`${tracker}-ink`];
  const text = (
    <FlexWidget clickAction="OPEN_APP" style={{ flex: stacked ? 0 : 1, flexDirection: 'column' }}>
      <Label w={w} text={title} size={13} weight={900} tint={ink} />
      <Label w={w} text={sub} size={11} weight={700} tint={ink} />
    </FlexWidget>
  );
  return (
    <FlexWidget
      style={{
        flex: 1,
        width: 'match_parent',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: stacked ? 'flex-start' : 'center',
        justifyContent: 'center',
        flexGap: 4,
        backgroundColor: color(w.p[`${tracker}-bg`]),
        borderRadius: w.radius.tile,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      {text}
      <FlexWidget style={{ width: stacked ? 'match_parent' : 72 }}>
        <Buttons buttons={buttons} tracker={tracker} w={w} height={30} title={spokenTitle} pending={pending} />
      </FlexWidget>
    </FlexWidget>
  );
}

/** Molly 4×3: a row per tracker. */
function Full({ view, w }: { view: Ready; w: Draw }) {
  const { sleep, feeding, diaper } = view;
  const row = (title: string, spokenTitle: string, tracker: Tracker, sub: string, buttons: Button[], pending: PendingView | null) => (
    <FlexWidget
      style={{
        flex: 1,
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        flexGap: 8,
        backgroundColor: color(w.p[`${tracker}-bg`]),
        borderRadius: w.radius.tile,
        paddingLeft: 12,
        paddingRight: 8,
      }}
    >
      <FlexWidget clickAction="OPEN_APP" style={{ flex: 1, flexDirection: 'column' }}>
        <Label w={w} text={title} size={14} weight={900} tint={w.p[`${tracker}-ink`]} />
        <Label w={w} text={sub} size={12} weight={700} tint={w.p[`${tracker}-ink`]} />
      </FlexWidget>
      {/* One button gets the 4×2's 72 dp, so its pending label fits. */}
      <FlexWidget style={{ width: Math.max(buttons.length * 58, 72) }}>
        <Buttons buttons={buttons} tracker={tracker} w={w} title={spokenTitle} pending={pending} />
      </FlexWidget>
    </FlexWidget>
  );
  return (
    <Shell w={w} background={w.p.surface}>
      <FlexWidget
        clickAction="OPEN_APP"
        accessibilityLabel="Open Molly"
        style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}
      >
        {titled(view, w, <Label w={w} text={view.badge?.name ?? w.c.appName} size={15} weight={900} tint={w.p.ink} />)}
        {stale(view, w)}
      </FlexWidget>
      {row(
        sleep.running ? `${since(w.c, 'sleep')} ${sleep.running.since}` : w.c.sleep,
        sleep.running ? `${since(PLAIN, 'sleep')} ${sleep.running.since}` : PLAIN.sleep,
        'sleep',
        status(sleep, awake(sleep)),
        [sleep.running ? SLEEP_STOP : SLEEP_START],
        sleep.pending,
      )}
      {row(
        feeding.running ? `${since(w.c, 'feed')} ${feeding.running.since}` : w.c.feedNoun,
        feeding.running ? `${since(PLAIN, 'feed')} ${feeding.running.since}` : PLAIN.feedNoun,
        'feed',
        status(feeding, feeding.side ? `${ago(feeding, 'since fed')} · ${feeding.side}` : ago(feeding, 'since fed')),
        feeding.running ? [LEFT, RIGHT, BOTTLE] : idleFeed(feeding),
        feeding.pending,
      )}
      {row(w.c.diaper, PLAIN.diaper, 'diaper', status(diaper, ago(diaper, 'ago')), diapers(w.c), diaper.pending)}
    </Shell>
  );
}

/** One tracker, 1×1: a single tap. A feed needs a side (running, or saved at once), so it opens the app. */
function Small({ tracker, view, w }: { tracker: Tracker; view: Ready; w: Draw }) {
  const { sleep, feeding } = view;
  const [action, big]: [string, string] =
    tracker === 'sleep'
      ? sleep.running
        ? ['SLEEP_STOP', 'Stop']
        : ['SLEEP_START', 'Start']
      : tracker === 'feed'
        ? feeding.running
          ? ['OPEN_APP', feeding.running.since]
          : feeding.instant
            ? ['OPEN_APP', `+ ${w.c.feed}`]
            : ['FEED_START', 'Start']
        : ['DIAPER_WET', `+ ${w.c.wet}`];
  const running = tracker === 'sleep' ? sleep.running : tracker === 'feed' ? feeding.running : null;
  const fill = running ? w.p[`${tracker}-ink`] : w.p[`${tracker}-bg`];
  const ink = running ? w.p[`${tracker}-bg`] : w.p[`${tracker}-ink`];
  const { note, pending } = tracker === 'sleep' ? sleep : tracker === 'feed' ? feeding : view.diaper;
  const likely = tracker === 'sleep' && !sleep.running ? sleep.likely : null;
  // The whole tile is the button: a tap on its way shows as its label, smaller and in the body face so it fits, faded.
  const sent = pending?.intent === action ? pending.label : null;
  return (
    <FlexWidget
      clickAction={action}
      accessibilityLabel={`${TITLES[tracker]}: ${sent ?? big}${likely ? `, ${likely.short}` : ''}`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: color(fill),
        borderRadius: w.radius.shell,
        // `Stopping…` needs about 56 dp: a 1×1 cell leaves about 54 inside the usual padding.
        paddingHorizontal: sent ? 10 : 12,
        paddingVertical: 10,
      }}
    >
      {titled(view, w, <Label w={w} text={note?.text ?? titles(w.c)[tracker]} size={13} tint={ink} />, 15)}
      <FlexWidget style={{ flexDirection: 'column' }}>
        {likely ? <Label w={w} text={likely.short} size={11} weight={700} tint={ink} /> : null}
        {sent ? (
          <Label w={w} text={sent} size={11} weight={900} tint={faded(ink, PENDING_ALPHA.tapped)} />
        ) : (
          <Label w={w} text={big} size={18} tint={pending ? faded(ink, PENDING_ALPHA.tapped) : ink} display />
        )}
      </FlexWidget>
    </FlexWidget>
  );
}

/** One tracker, 2×1: its last event at a glance. */
function Wide({ tracker, view, w }: { tracker: Tracker; view: Ready; w: Draw }) {
  const ink = w.p[`${tracker}-ink`];
  const row = tracker === 'sleep' ? view.sleep : tracker === 'feed' ? view.feeding : view.diaper;
  const title = row.running
    ? since(w.c, tracker === 'sleep' ? 'sleep' : 'feed')
    : tracker === 'sleep'
      ? 'Awake since'
      : tracker === 'feed'
        ? view.feeding.side
          ? `Last feed · ${view.feeding.side}`
          : 'Last feed'
        : 'Last diaper';
  return (
    <Shell w={w} background={w.p[`${tracker}-bg`]} padding={12} open>
      {titled(view, w, <Label w={w} text={row.note?.text ?? title} size={12} tint={ink} />, 16)}
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'flex-end' }}>
        <Label w={w} text={row.running?.since ?? row.lastAt ?? '—'} size={24} tint={ink} display />
        <Label w={w} text={row.running ? status(row, '') : ago(row, 'ago')} size={12} weight={700} tint={ink} />
      </FlexWidget>
    </Shell>
  );
}

/** One tracker, 2×2: its timer or last event, and its buttons. */
function Large({ tracker, view, w }: { tracker: Tracker; view: Ready; w: Draw }) {
  const ink = w.p[`${tracker}-ink`];
  const { sleep, feeding, diaper } = view;
  const content =
    tracker === 'sleep'
      ? sleep.running
        ? { title: since(w.c, 'sleep'), big: sleep.running.since, sub: status(sleep, ''), buttons: [SLEEP_STOP] }
        : {
            title: 'Awake since',
            big: sleep.lastAt ?? '—',
            sub: status(sleep, ago(sleep, 'awake')),
            buttons: [{ ...SLEEP_START, label: w.c.startSleep }],
          }
      : tracker === 'feed'
        ? feeding.running
          ? {
              title: since(w.c, 'feed'),
              big: feeding.running.since,
              sub: feeding.side ? `${status(feeding, '')} · last ${feeding.side}` : status(feeding, ''),
              buttons: [LEFT, RIGHT, BOTTLE],
            }
          : {
              title: feeding.side ? `Last feed · ${feeding.side}` : 'Last feed',
              big: feeding.lastAt ?? '—',
              sub: status(feeding, ago(feeding, 'ago')),
              // Shorter than the app's `Start feeding`, unless the theme has its own words.
              buttons: idleFeed(feeding, { ...FEED_START, label: spoken(w.c.startFeed, PLAIN.startFeed) === undefined ? 'Start feed' : w.c.startFeed }),
            }
        : { title: 'Last diaper', big: diaper.lastAt ?? '—', sub: status(diaper, ago(diaper, 'ago')), buttons: diapers(w.c) };
  return (
    <Shell w={w} background={w.p[`${tracker}-bg`]}>
      <FlexWidget clickAction="OPEN_APP" style={{ flex: 1, width: 'match_parent', flexDirection: 'column' }}>
        {/* Several children: the avatar and name on a row of their own, as the widget's owner. */}
        {view.badge ? titled(view, w, <Label w={w} text={view.badge.name} size={13} weight={900} tint={ink} />, 22) : null}
        <Label w={w} text={content.title} size={view.badge ? 12 : 13} tint={ink} />
        <Label w={w} text={content.big} size={36} tint={ink} display />
        <Label w={w} text={content.sub} size={12} weight={700} tint={ink} />
        {tracker === 'sleep' && !sleep.running && sleep.likely ? (
          <Label w={w} text={sleep.likely.window} size={13} weight={800} tint={ink} />
        ) : null}
        {stale(view, w)}
      </FlexWidget>
      <Buttons
        buttons={content.buttons}
        tracker={tracker}
        w={w}
        height={44}
        title={TITLES[tracker]}
        pending={(tracker === 'sleep' ? sleep : tracker === 'feed' ? feeding : diaper).pending}
      />
    </Shell>
  );
}

/** Both halves of the day/night pair; Android shows the one matching the phone's dark mode. */
export function widgetRepresentation(
  info: { widgetName: string; width: number; height: number },
  view: WidgetView,
  settings: Pick<Settings, 'theme' | 'look' | 'playful'>,
): WidgetRepresentation {
  const name = WIDGET_NAMES.find((known) => known === info.widgetName) ?? 'Molly';
  const layout = widgetLayout(name, info);
  const themes = widgetThemes(settings);
  const draw = (theme: WidgetTheme) => <MollyWidget name={name} layout={layout} view={view} w={drawWith(theme)} />;
  return { light: draw(themes.light), dark: draw(themes.dark) };
}
