import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { percentCorners, roundedBox, type Ornaments } from './ornaments';

/** Room around the 100 × 100 face for the ear bow, which pokes out past its top and right edge. */
const PAD = { left: 4, top: 8 };
const BOX = 100 + PAD.left + 4;

// The bow on its right ear: the design's 42 % × 26 % box at (58 %, −1 %), turned 16°, two loops and a knot.
const EAR_BOW = { x: 58, y: -1, width: 42, height: 26 };
const earBow = (() => {
  const { x, y, width, height } = EAR_BOW;
  const loop = { width: width * 0.46, height };
  const knot = { x: x + width * 0.37, y: y + height * 0.2, width: width * 0.26, height: height * 0.6 };
  return {
    loops: [
      roundedBox(x, y, loop.width, loop.height, percentCorners(loop.width, loop.height, [50, 25, 25, 50])),
      roundedBox(x + width * 0.54, y, loop.width, loop.height, percentCorners(loop.width, loop.height, [25, 50, 50, 25])),
    ],
    knot: roundedBox(knot.x, knot.y, knot.width, knot.height, percentCorners(knot.width, knot.height, [40, 40, 40, 40])),
    transform: `rotate(16 ${x + width / 2} ${y + height / 2})`,
  };
})();

/**
 * The design's `Teddy Bear` (Ribbon's ring corner), with a bow on one ear. `sleepy`: closed-eye arcs instead
 * of dots. `size`: the face's width, px.
 */
export function Teddy({
  size,
  colors,
  bow,
  sleepy,
  tilt = 0,
}: {
  size: number;
  colors: Ornaments['teddy'];
  bow: Ornaments['bow'];
  sleepy: boolean;
  tilt?: number;
}) {
  const { fur, muzzle, ink, cheek } = colors;
  // The design's lids: max(1.5 px, 3 % of the size), in px.
  const lid = (Math.max(1.5, size * 0.03) * 100) / size;
  const box = (size * BOX) / 100;
  return (
    <View aria-hidden pointerEvents="none" style={{ width: size, height: size, transform: [{ rotate: `${tilt}deg` }] }}>
      <Svg
        width={box}
        height={box}
        viewBox={`${-PAD.left} ${-PAD.top} ${BOX} ${BOX}`}
        style={{ position: 'absolute', left: (-PAD.left * size) / 100, top: (-PAD.top * size) / 100 }}
      >
        {[20, 80].map((cx) => (
          <G key={cx}>
            <Circle cx={cx} cy={22} r={16} fill={fur} />
            <Circle cx={cx} cy={22} r={8.32} fill={muzzle} />
          </G>
        ))}
        <Ellipse cx={50} cy={55} rx={42} ry={37} fill={fur} />
        {[35, 65].map((cx) =>
          sleepy ? (
            <Path key={cx} d={`M${cx - 6} 47A6 ${3 - lid / 2} 0 0 0 ${cx + 6} 47`} stroke={ink} strokeWidth={lid} strokeLinecap="round" fill="none" />
          ) : (
            <Ellipse key={cx} cx={cx} cy={48.5} rx={4} ry={4.5} fill={ink} />
          ),
        )}
        {[23.5, 76.5].map((cx) => (
          <Ellipse key={cx} cx={cx} cy={63} rx={6.5} ry={4} fill={cheek} />
        ))}
        <Ellipse cx={50} cy={68} rx={16} ry={12} fill={muzzle} />
        <Ellipse cx={50} cy={62.75} rx={6} ry={4.25} fill={ink} />
        <G transform={earBow.transform}>
          {earBow.loops.map((d) => (
            <Path key={d} d={d} fill={bow.color} />
          ))}
          <Path d={earBow.knot} fill={bow.shade} />
        </G>
      </Svg>
    </View>
  );
}
