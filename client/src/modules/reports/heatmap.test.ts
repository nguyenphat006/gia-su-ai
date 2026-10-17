import { describe, expect, it } from "vitest";
import { buildHeatmapMatrix, HEAT_LEVELS, heatLevel, heatMixPercent } from "./heatmap";

describe("buildHeatmapMatrix", () => {
  it("builds an empty 7 × 24 grid", () => {
    const { matrix, max, total } = buildHeatmapMatrix([]);
    expect(matrix).toHaveLength(7);
    expect(matrix.every((row) => row.length === 24 && row.every((v) => v === 0))).toBe(true);
    expect([max, total]).toEqual([0, 0]);
  });

  it("places cells by ISO weekday (1 = Monday) and hour", () => {
    const { matrix, max, total } = buildHeatmapMatrix([
      { weekday: 1, hour: 0, count: 2 },
      { weekday: 7, hour: 23, count: 5 },
      { weekday: 3, hour: 20, count: 1 },
    ]);
    expect(matrix[0][0]).toBe(2);
    expect(matrix[6][23]).toBe(5);
    expect(matrix[2][20]).toBe(1);
    expect(max).toBe(5);
    expect(total).toBe(8);
  });

  it("sums duplicates and skips out-of-range or empty cells", () => {
    const { matrix, max, total } = buildHeatmapMatrix([
      { weekday: 2, hour: 9, count: 3 },
      { weekday: 2, hour: 9, count: 4 },
      { weekday: 0, hour: 9, count: 10 },
      { weekday: 8, hour: 9, count: 10 },
      { weekday: 2, hour: 24, count: 10 },
      { weekday: 2, hour: 10, count: 0 },
    ]);
    expect(matrix[1][9]).toBe(7);
    expect(max).toBe(7);
    expect(total).toBe(7);
  });
});

describe("heatLevel", () => {
  it("is 0 only for empty cells", () => {
    expect(heatLevel(0, 10)).toBe(0);
    expect(heatLevel(5, 0)).toBe(0);
    expect(heatLevel(1, 1000)).toBe(1);
  });

  it("reaches the top level at the max", () => {
    expect(heatLevel(10, 10)).toBe(HEAT_LEVELS - 1);
    expect(heatLevel(5, 10)).toBeLessThan(HEAT_LEVELS - 1);
  });
});

describe("heatMixPercent", () => {
  it("grows with the level and stays within 0..100", () => {
    const values = Array.from({ length: HEAT_LEVELS }, (_, l) => heatMixPercent(l));
    expect(values[0]).toBe(0);
    expect(values.every((v, i) => i === 0 || v > values[i - 1])).toBe(true);
    expect(values[HEAT_LEVELS - 1]).toBeLessThanOrEqual(100);
  });
});
