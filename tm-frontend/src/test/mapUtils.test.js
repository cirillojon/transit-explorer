import { describe, it, expect } from "vitest";
import { slicePolylineByStops } from "../components/map/mapUtils";

describe("slicePolylineByStops", () => {
  it("returns one segment per consecutive stop pair", () => {
    // Straight east-west line with three on-line stops.
    const line = [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ];
    const stops = [
      [0, 0],
      [0, 2],
      [0, 4],
    ];
    const segs = slicePolylineByStops(line, stops);
    expect(segs).toHaveLength(2);
    // Each segment starts/ends at the real stop coords.
    expect(segs[0][0]).toEqual(stops[0]);
    expect(segs[0][segs[0].length - 1]).toEqual(stops[1]);
    expect(segs[1][0]).toEqual(stops[1]);
    expect(segs[1][segs[1].length - 1]).toEqual(stops[2]);
  });

  it("returns empty when fewer than 2 stops", () => {
    expect(slicePolylineByStops([[0, 0]], [[0, 0]])).toEqual([]);
    expect(slicePolylineByStops([], [])).toEqual([]);
  });

  it("falls back to straight lines when polyline is empty", () => {
    const stops = [
      [0, 0],
      [0, 1],
      [0, 2],
    ];
    const segs = slicePolylineByStops([], stops);
    expect(segs).toEqual([
      [
        [0, 0],
        [0, 1],
      ],
      [
        [0, 1],
        [0, 2],
      ],
    ]);
  });

  it("connects an off-route stop with a straight line to its neighbors", () => {
    // Polyline runs along latitude 0 from lon 0..4. Middle stop is far north
    // (off-route).
    const line = [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ];
    const stops = [
      [0, 0], // on-line
      [5, 2], // way off-line
      [0, 4], // on-line
    ];
    const segs = slicePolylineByStops(line, stops);
    expect(segs).toHaveLength(2);
    // Both segments adjacent to the off-route stop should be straight
    // 2-point connectors so the marker isn't orphaned.
    expect(segs[0]).toEqual([
      [0, 0],
      [5, 2],
    ]);
    expect(segs[1]).toEqual([
      [5, 2],
      [0, 4],
    ]);
  });

  it("uses straight-line fallback for leading off-route stops (bus 3 case)", () => {
    // Simulates the bus 3 direction-0 bug: first few stops live on a side
    // street the agency polyline never enters; the rest of the route is
    // properly covered.
    const line = [
      [0, 10], // start of "covered" geometry
      [0, 11],
      [0, 12],
      [0, 13],
    ];
    const stops = [
      [5, 0], // off-route
      [5, 0.1], // off-route
      [5, 0.2], // off-route
      [0, 10], // joins the polyline
      [0, 12], // on-line
      [0, 13], // on-line
    ];
    const segs = slicePolylineByStops(line, stops);
    expect(segs).toHaveLength(stops.length - 1);
    // Every consecutive pair has a non-empty segment whose endpoints are
    // the real stop coords — no invisible gaps.
    for (let i = 0; i < segs.length; i++) {
      expect(segs[i].length).toBeGreaterThanOrEqual(2);
      expect(segs[i][0]).toEqual(stops[i]);
      expect(segs[i][segs[i].length - 1]).toEqual(stops[i + 1]);
    }
    // The on-line stretch from [0,10] -> [0,12] should walk through the
    // intermediate polyline vertex at [0,11].
    expect(segs[3]).toEqual([
      [0, 10],
      [0, 11],
      [0, 12],
    ]);
  });

  it("falls back to straight line when snaps would go backwards", () => {
    // Two stops both close to the line but the second one is closer to an
    // earlier polyline vertex than the first — naive nearest-snap would
    // produce a backwards slice.
    const line = [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ];
    const stops = [
      [0, 2.9], // snaps to index 3
      [0, 0.1], // snaps to index 0 -> backwards
    ];
    const segs = slicePolylineByStops(line, stops);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual([stops[0], stops[1]]);
  });
});
