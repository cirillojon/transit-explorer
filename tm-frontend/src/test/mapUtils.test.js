import { describe, it, expect } from "vitest";
import {
  slicePolylineByStops,
  slicePolylineByStopsWithFallbacks,
} from "../components/map/mapUtils";

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

  it("returns null when a stop pair would slice backwards on the polyline", () => {
    // Mirrors the 2 Line direction_id=1 bad-data case: the route's last
    // stop entry is actually a mid-route station, so it snaps to an
    // earlier polyline vertex than its predecessor. We must NOT draw a
    // long backwards line across the polyline.
    const line = [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ];
    const stops = [
      [0, 4], // snaps to last index (end of line)
      [0, 2], // snaps to middle — backwards from the previous snap
    ];
    const segs = slicePolylineByStops(line, stops);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toBeNull();
  });
});

describe("slicePolylineByStopsWithFallbacks", () => {
  it("uses the primary polyline when it covers all stops", () => {
    const primary = [
      [0, 0],
      [0, 1],
      [0, 2],
    ];
    const stops = [
      [0, 0],
      [0, 2],
    ];
    const segs = slicePolylineByStopsWithFallbacks(primary, [], stops);
    expect(segs).toHaveLength(1);
    expect(segs[0][0]).toEqual(stops[0]);
    expect(segs[0][segs[0].length - 1]).toEqual(stops[1]);
  });

  it("falls back to a reversed opposite-direction polyline (1 Line case)", () => {
    // Mirrors Sound Transit 1 Line: the active direction's polyline only
    // covers the northern half of the route, so the southern stops would
    // render as null. The opposite direction's polyline covers the full
    // route — but it runs the other way, so we have to walk it backwards.
    const truncatedPrimary = [
      [0, 5], // only the northern half
      [0, 6],
      [0, 7],
      [0, 8],
    ];
    const fullOpposite = [
      [0, 8], // opposite direction, full route, runs north -> south
      [0, 7],
      [0, 6],
      [0, 5],
      [0, 4],
      [0, 3],
      [0, 2],
      [0, 1],
      [0, 0],
    ];
    // Stops in the active direction: south -> north.
    const stops = [
      [0, 0], // off the truncated primary; covered by opposite (reversed)
      [0, 2], // off the truncated primary; covered by opposite (reversed)
      [0, 5], // on the primary
      [0, 8], // on the primary
    ];
    const segs = slicePolylineByStopsWithFallbacks(
      truncatedPrimary,
      [fullOpposite],
      stops,
    );
    expect(segs).toHaveLength(3);
    // Southern hops were rescued by the opposite-direction fallback.
    expect(segs[0]).not.toBeNull();
    expect(segs[0][0]).toEqual(stops[0]);
    expect(segs[0][segs[0].length - 1]).toEqual(stops[1]);
    expect(segs[1]).not.toBeNull();
    expect(segs[1][0]).toEqual(stops[1]);
    expect(segs[1][segs[1].length - 1]).toEqual(stops[2]);
    // Hops fully on the primary use the primary polyline.
    expect(segs[2]).not.toBeNull();
    expect(segs[2][0]).toEqual(stops[2]);
    expect(segs[2][segs[2].length - 1]).toEqual(stops[3]);
  });

  it("returns null when no polyline (primary or fallback) covers a hop", () => {
    const primary = [
      [0, 0],
      [0, 1],
    ];
    const fallback = [
      [0, 0],
      [0, 1],
    ];
    const stops = [
      [5, 5], // far off both lines
      [5, 6], // far off both lines
    ];
    const segs = slicePolylineByStopsWithFallbacks(primary, [fallback], stops);
    expect(segs).toEqual([null]);
  });
});
