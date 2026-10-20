import { describe, expect, it } from 'vitest';

import { temperature } from '../test/fixtures';
import { feverCard, temperatureRows, temperatureView, temperatureZone } from './temperature';

const now = new Date(2026, 8, 28, 12, 5);
const at = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes).toISOString();

describe('the temperature zone', () => {
  it.each([
    [35.9, 'Low'],
    [36.0, 'Normal'],
    [37.4, 'Normal'],
    [37.5, 'Raised'],
    [37.9, 'Raised'],
    [38.0, 'Fever'],
  ])('of %d °C is %s', (celsius, zone) => {
    // When
    const result = temperatureZone(celsius);

    // Then
    expect(result).toBe(zone);
  });
});

describe('the temperature bar', () => {
  it('marks the latest reading and pins the four before, fading', () => {
    // Given
    const readings = [
      temperature(at(26, 18, 5), 38.1),
      temperature(at(26, 22, 30), 38.4),
      temperature(at(27, 14), 37.9),
      temperature(at(27, 20, 10), 37.2),
      temperature(at(28, 7, 40), 36.9),
      temperature(at(25, 7, 40), 36.7),
    ];

    // When
    const view = temperatureView(readings, now);

    // Then
    expect(view.latest?.x).toBeCloseTo(0.311, 3);
    expect(view.pins.map((pin) => [Number(pin.x.toFixed(3)), pin.fade])).toEqual([
      [0.378, 0.5],
      [0.533, 0.42],
      [0.644, 0.34],
      [0.578, 0.26],
    ]);
    expect(view.line).toBe('Today 07:40 · Normal');
  });

  it('keeps readings outside 35.5–40 °C at the ends', () => {
    // When
    const view = temperatureView([temperature(at(28, 7), 41)], now);

    // Then
    expect(view.latest).toEqual({ x: 1 });
  });

  it('is nothing without a reading', () => {
    // When
    const view = temperatureView([], now);

    // Then
    expect(view).toEqual({ latest: null, pins: [], line: null });
  });
});

describe('the fever card', () => {
  it('is nothing without a fever reading', () => {
    // When
    const card = feverCard([temperature(at(27, 8), 37.9), temperature(at(28, 7), 36.9)], now);

    // Then
    expect(card).toBeNull();
  });

  it('shows a single fever reading followed by a normal one', () => {
    // When
    const card = feverCard([temperature(at(27, 8), 38.2), temperature(at(27, 14), 37.0)], now);

    // Then
    expect(card).toEqual({ title: 'Fever 27 Sep', detail: 'Peak 38.2 °C · back to normal after 6h · 2 readings' });
  });

  it('runs from the first fever reading to the first normal one, through raised ones', () => {
    // Given
    const readings = [
      temperature(at(25, 7, 40), 36.7),
      temperature(at(26, 18, 5), 38.1),
      temperature(at(26, 22, 30), 38.4),
      temperature(at(27, 14), 37.9),
      temperature(at(27, 20, 10), 37.2),
      temperature(at(28, 7, 40), 36.9),
    ];

    // When
    const card = feverCard(readings, now);

    // Then
    expect(card).toEqual({ title: 'Fever 26 – 27 Sep', detail: 'Peak 38.4 °C · back to normal after 26h · 4 readings' });
  });

  it('says when the fever is still going', () => {
    // Given
    const readings = [temperature(at(27, 18), 38.1), temperature(at(28, 7), 37.8)];

    // When
    const card = feverCard(readings, now);

    // Then
    expect(card).toEqual({ title: 'Fever since 27 Sep', detail: 'Peak 38.1 °C · still going · 2 readings' });
  });

  it('shows the most recent episode', () => {
    // Given
    const readings = [
      temperature(at(10, 8), 39),
      temperature(at(10, 20), 36.8),
      temperature(at(20, 8), 38.3),
      temperature(at(23, 9), 36.9),
    ];

    // When
    const card = feverCard(readings, now);

    // Then
    expect(card?.title).toBe('Fever 20 – 23 Sep');
    expect(card?.detail).toBe('Peak 38.3 °C · back to normal after 3 days · 2 readings');
  });

  it('spans months in its title', () => {
    // When
    const card = feverCard([temperature(at(30, 20), 38.5), temperature(new Date(2026, 9, 1, 9).toISOString(), 36.8)], new Date(2026, 9, 2));

    // Then
    expect(card?.title).toBe('Fever 30 Sep – 1 Oct');
  });

  it('is nothing when the last episode ended over 30 days ago', () => {
    // When
    const card = feverCard([temperature(at(1, 8), 38.5), temperature(at(1, 20), 36.8)], new Date(2026, 9, 2));

    // Then
    expect(card).toBeNull();
  });
});

describe('the temperature list', () => {
  it('gives the time, value and zone of the newest readings', () => {
    // When
    const rows = temperatureRows([temperature(at(27, 20, 10), 37.2), temperature(at(28, 7, 40), 38.0)], now, 5);

    // Then
    expect(rows).toEqual([
      { date: 'Today 07:40', value: '38.0 °C', zone: 'Fever' },
      { date: '27 Sep 20:10', value: '37.2 °C', zone: 'Normal' },
    ]);
  });
});
