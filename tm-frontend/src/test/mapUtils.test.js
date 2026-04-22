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

  it("returns all-null segments when polyline is empty", () => {
    const stops = [
      [0, 0],
      [0, 1],
      [0, 2],
    ];
    const segs = slicePolylineByStops([], stops);
    // No fabricated geometry — caller should skip these visually.
    expect(segs).toEqual([null, null]);
  });

  it("returns null for stop pairs with an off-route endpoint", () => {
    // Polyline runs along latitude 0 from lon 0..4. Middle stop is far
    // north of the line (off-route).
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
    // Both segments touch the off-route stop → null. We deliberately do
    // NOT fabricate a straight line across the map.
    expect(segs[0]).toBeNull();
    expect(segs[1]).toBeNull();
  });

  it("returns null for leading off-route stops (bus 3 case)", () => {
    // First few stops live on a side street the agency polyline never
    // enters; the rest of the route is properly covered.
    const line = [
      [0, 10],
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
    // Pairs touching off-route stops are skipped (null).
    expect(segs[0]).toBeNull();
    expect(segs[1]).toBeNull();
    expect(segs[2]).toBeNull();
    // Pairs entirely on the polyline render normally and walk the line.
    expect(segs[3]).toEqual([
      [0, 10],
      [0, 11],
      [0, 12],
    ]);
    expect(segs[4]).toEqual([
      [0, 12],
      [0, 13],
    ]);
  });

  it("renders close on-route stops sharing a polyline vertex", () => {
    // Two on-route stops that snap to the same polyline vertex (a normal
    // case for densely-spaced urban stops). Should still render — NOT be
    // skipped — so adjacent stops aren't visually disconnected.
    const line = [
      [0, 0],
      [0, 1],
      [0, 2],
    ];
    const stops = [
      [0.0001, 1.0], // snaps to index 1
      [0.0001, 1.001], // also snaps to index 1
    ];
    const segs = slicePolylineByStops(line, stops);
    expect(segs).toHaveLength(1);
    expect(segs[0]).not.toBeNull();
    expect(segs[0][0]).toEqual(stops[0]);
    expect(segs[0][segs[0].length - 1]).toEqual(stops[1]);
  });
});
