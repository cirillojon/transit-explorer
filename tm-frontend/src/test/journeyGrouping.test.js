import { describe, it, expect } from "vitest";
import { groupIntoJourneys } from "../components/journeyGrouping";

// Helper to build a hop with sensible defaults. Stop names mirror ids so
// assertions can check `boardStop`/`alightStop` directly against ids.
function hop(overrides) {
  const base = {
    id: 0,
    direction_id: "0",
    direction_name: "Northbound",
    from_stop_id: "A",
    to_stop_id: "B",
    completed_at: "2026-04-22T20:16:18.604008",
    duration_ms: null,
    notes: "",
    ...overrides,
  };
  return {
    ...base,
    from_stop_name: overrides?.from_stop_name ?? base.from_stop_id,
    to_stop_name: overrides?.to_stop_name ?? base.to_stop_id,
  };
}

const dir0 = {
  direction_id: "0",
  stop_ids: ["s1", "s2", "s3", "s4", "s5"],
};
const dir1 = {
  direction_id: "1",
  stop_ids: ["s5", "s4", "s3", "s2", "s1"],
};

describe("groupIntoJourneys", () => {
  it("merges shuffled hops at the same timestamp into one journey", () => {
    // Production HAR: trip with hops returned out of route order.
    const t = "2026-04-22T20:16:18.604008";
    const segs = [
      hop({ id: 384, from_stop_id: "s4", to_stop_id: "s5", completed_at: t }),
      hop({ id: 381, from_stop_id: "s1", to_stop_id: "s2", completed_at: t }),
      hop({ id: 382, from_stop_id: "s2", to_stop_id: "s3", completed_at: t }),
      hop({ id: 383, from_stop_id: "s3", to_stop_id: "s4", completed_at: t }),
    ];
    const journeys = groupIntoJourneys(segs, [dir0]);
    expect(journeys).toHaveLength(1);
    expect(journeys[0].boardStop).toBe("s1");
    expect(journeys[0].alightStop).toBe("s5");
    expect(journeys[0].stopCount).toBe(5);
  });

  it("splits two trips on the same direction into separate journeys", () => {
    const t1 = "2026-04-22T20:16:18.604008";
    const t2 = "2026-04-22T21:00:00.000000";
    const segs = [
      hop({ id: 1, from_stop_id: "s1", to_stop_id: "s2", completed_at: t1 }),
      hop({ id: 2, from_stop_id: "s2", to_stop_id: "s3", completed_at: t1 }),
      hop({ id: 3, from_stop_id: "s3", to_stop_id: "s4", completed_at: t2 }),
      hop({ id: 4, from_stop_id: "s4", to_stop_id: "s5", completed_at: t2 }),
    ];
    const journeys = groupIntoJourneys(segs, [dir0]);
    expect(journeys).toHaveLength(2);
    // Newest first.
    expect(journeys[0].startedAt).toBe(t2);
    expect(journeys[0].boardStop).toBe("s3");
    expect(journeys[0].alightStop).toBe("s5");
    expect(journeys[1].startedAt).toBe(t1);
    expect(journeys[1].boardStop).toBe("s1");
    expect(journeys[1].alightStop).toBe("s3");
  });

  it("keeps trips on different directions separate even at same timestamp", () => {
    const t = "2026-04-22T20:16:18.604008";
    const segs = [
      hop({
        id: 1, direction_id: "0", from_stop_id: "s1", to_stop_id: "s2",
        completed_at: t,
      }),
      hop({
        id: 2, direction_id: "1", from_stop_id: "s5", to_stop_id: "s4",
        completed_at: t,
      }),
    ];
    const journeys = groupIntoJourneys(segs, [dir0, dir1]);
    expect(journeys).toHaveLength(2);
    const dirs = journeys.map((j) => j.directionId).sort();
    expect(dirs).toEqual(["0", "1"]);
  });

  it("returns [] for empty input", () => {
    expect(groupIntoJourneys([])).toEqual([]);
  });

  it("falls back to id ordering when directions metadata is missing", () => {
    const t = "2026-04-22T20:16:18.604008";
    const segs = [
      hop({ id: 2, from_stop_id: "s2", to_stop_id: "s3", completed_at: t }),
      hop({ id: 1, from_stop_id: "s1", to_stop_id: "s2", completed_at: t }),
    ];
    const journeys = groupIntoJourneys(segs, []);
    expect(journeys).toHaveLength(1);
    expect(journeys[0].boardStop).toBe("s1");
    expect(journeys[0].alightStop).toBe("s3");
  });
});
