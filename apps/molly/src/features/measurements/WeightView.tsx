import type { Weight } from '@molly/api';
import { birthDipText, centileChip, weightChart, type Sex, type WeightChart, type WeightRange } from '@molly/core';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline } from 'react-native-svg';

import { FIXED_SCALE, Panel, Segment, Text } from '@/components/ui';
import { useTheme } from '@/theme/theme';

const CHART_HEIGHT = 230;
/** Room on the right for the band labels. */
const LABEL_ROOM = 34;

/** The design's weight screen pictures (2a, 2b): the centile chip, the chart over WHO bands, the birth dip. */
export function WeightView({ weights, sex, birthDate, now }: { weights: Weight[]; sex: Sex | null; birthDate: string; now: Date }) {
  const [range, setRange] = useState<WeightRange>('lastYear');
  const chart = weightChart(weights, sex, birthDate, now, range);
  const chip = centileChip(weights, sex, birthDate, now);
  const dip = birthDipText(weights, birthDate, now);
  return (
    <>
      {chip && (
        <View className="self-start rounded-chip bg-grow-bg px-3 py-1.5">
          <Text className="text-sm font-display text-grow-ink">{chip}</Text>
        </View>
      )}
      <Panel className="gap-2.5 px-3.5 pb-2.5 pt-3.5">
        {chart.axis.switchable && (
          <Segment
            small
            label="Chart range"
            options={[
              { value: 'lastYear', label: 'Last year' },
              { value: 'sinceBirth', label: 'Since birth' },
            ]}
            value={range}
            onChange={setRange}
          />
        )}
        <Chart chart={chart} />
      </Panel>
      {dip && (
        <Panel className="gap-1 px-4 py-3.5">
          <Text className="text-[15px] font-display">Birth dip</Text>
          <Text className="text-sm font-bold text-muted">{dip}</Text>
        </Panel>
      )}
    </>
  );
}

function Chart({ chart }: { chart: WeightChart }) {
  const { palette: p } = useTheme();
  const [width, setWidth] = useState(0);
  const plot = Math.max(0, width - LABEL_ROOM);
  const { axis, bands, points, min, max } = chart;
  const x = (day: number) => ((day - axis.from) / Math.max(1, axis.to - axis.from)) * plot;
  const y = (grams: number) => CHART_HEIGHT - ((grams - min) / (max - min)) * CHART_HEIGHT;
  const edge = (key: 'p3' | 'p15' | 'p50' | 'p85' | 'p97', reverse = false) => {
    const list = (bands ?? []).map((band) => `${x(band.day)},${y(band[key])}`);
    return reverse ? list.reverse() : list;
  };
  const last = bands?.at(-1);
  return (
    <View
      accessible
      accessibilityLabel={`Weight chart, ${points.length} weights${bands ? ', over the WHO ranges' : ''}`}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <View style={{ height: CHART_HEIGHT }}>
        {width > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            {bands && (
              <>
                <Polygon points={[...edge('p97'), ...edge('p3', true)].join(' ')} fill={p['grow-bg']} opacity={0.5} />
                <Polygon points={[...edge('p85'), ...edge('p15', true)].join(' ')} fill={p['grow-bg']} />
                <Polyline points={edge('p50').join(' ')} fill="none" stroke={p['grow-mid']} strokeWidth={1.5} strokeDasharray="4 4" />
              </>
            )}
            {axis.ticks.map((tick) => (
              <Line key={tick.day} x1={x(tick.day)} x2={x(tick.day)} y1={CHART_HEIGHT - 4} y2={CHART_HEIGHT} stroke={p.line} strokeWidth={1} />
            ))}
            {points.length > 1 && (
              <Polyline
                points={points.map((point) => `${x(point.day)},${y(point.grams)}`).join(' ')}
                fill="none"
                stroke={p['grow-ink']}
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
            )}
            {points.map((point) => (
              <Circle key={point.day} cx={x(point.day)} cy={y(point.grams)} r={3.75} fill={p.surface} stroke={p['grow-ink']} strokeWidth={2.5} />
            ))}
          </Svg>
        )}
        {last &&
          (
            [
              ['97th', last.p97],
              ['50th', last.p50],
              ['3rd', last.p3],
            ] as const
          ).map(([label, grams]) => (
            <Text
              key={label}
              maxFontSizeMultiplier={FIXED_SCALE}
              aria-hidden
              className="absolute text-[11px] font-extrabold text-grow-ink"
              style={{ left: plot + 6, top: y(grams) - 8 }}
            >
              {label}
            </Text>
          ))}
      </View>
      <View className="h-4" style={{ marginRight: LABEL_ROOM }}>
        {axis.ticks.map((tick) => (
          <Text
            key={tick.day}
            maxFontSizeMultiplier={FIXED_SCALE}
            aria-hidden
            className="absolute w-14 text-center text-xs font-extrabold text-muted"
            // Centred on its tick, but kept inside the card's padding at the left edge.
            style={{ left: Math.max(-14, x(tick.day) - 28) }}
          >
            {tick.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
