import React from "react";

const ROUTE_TYPE_ICONS = {
  0: "🚊",
  1: "🚇",
  2: "🚆",
  3: "🚌",
  4: "⛴️",
  5: "🚠",
  6: "🚠",
  7: "🚞",
};

const ROUTE_TYPE_NAMES = {
  0: "Tram",
  1: "Subway",
  2: "Rail",
  3: "Bus",
  4: "Ferry",
  5: "Cable",
  6: "Gondola",
  7: "Funicular",
};

const FILTER_BUTTONS = [
  { key: "all", label: "All" },
  { key: "in_progress", label: "In progress" },
  { key: "complete", label: "Complete" },
  { key: "untouched", label: "Untouched" },
];

const SORT_BUTTONS = [
  { key: "name", label: "Name" },
  { key: "completion", label: "Progress" },
  { key: "size", label: "Size" },
];

function RouteList({ routes, progress, selectedRoute, onSelectRoute }) {
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [sort, setSort] = React.useState("name");
  const [typeFilter, setTypeFilter] = React.useState("all");

  const completionMap = React.useMemo(() => {
    const map = {};
    for (const rp of progress || []) {
      map[rp.route_id] = {
        pct: rp.completion_pct,
        completed: rp.completed_segments,
        total: rp.total_segments,
      };
    }
    return map;
  }, [progress]);

  const types = React.useMemo(() => {
    const s = new Set();
    routes?.forEach((r) => s.add(r.route_type));
    return Array.from(s);
  }, [routes]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = routes || [];
    if (q) {
      list = list.filter(
        (r) =>
          (r.short_name || "").toLowerCase().includes(q) ||
          (r.long_name || "").toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q),
      );
    }
    if (typeFilter !== "all") {
      list = list.filter((r) => String(r.route_type) === String(typeFilter));
    }
    if (filter !== "all") {
      list = list.filter((r) => {
        const c = completionMap[r.id];
        if (filter === "in_progress") return c && c.pct > 0 && c.pct < 100;
        if (filter === "complete") return c && c.pct >= 100;
        if (filter === "untouched") return !c || c.pct === 0;
        return true;
      });
    }
    const sorted = [...list];
    if (sort === "completion") {
      sorted.sort(
        (a, b) =>
          (completionMap[b.id]?.pct || 0) - (completionMap[a.id]?.pct || 0),
      );
    } else if (sort === "size") {
      sorted.sort((a, b) => (b.total_segments || 0) - (a.total_segments || 0));
    } else {
      sorted.sort((a, b) =>
        (a.short_name || a.long_name || "").localeCompare(
          b.short_name || b.long_name || "",
          undefined,
          { numeric: true, sensitivity: "base" },
        ),
      );
    }
    return sorted;
  }, [routes, search, filter, sort, typeFilter, completionMap]);

  return (
    <div className="route-list">
      <div className="route-search-wrap">
        <span className="route-search-icon">🔍</span>
        <input
          type="text"
          className="route-search"
          placeholder="Search routes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="route-search-clear"
            onClick={() => setSearch("")}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="chip-row">
        {FILTER_BUTTONS.map((b) => (
          <button
            key={b.key}
            className={`chip ${filter === b.key ? "chip-active" : ""}`}
            onClick={() => setFilter(b.key)}
          >
            {b.label}
          </button>
        ))}
      </div>

      {types.length > 1 && (
        <div className="chip-row">
          <button
            className={`chip ${typeFilter === "all" ? "chip-active" : ""}`}
            onClick={() => setTypeFilter("all")}
          >
            All modes
          </button>
          {types.map((t) => (
            <button
              key={t}
              className={`chip ${String(typeFilter) === String(t) ? "chip-active" : ""}`}
              onClick={() => setTypeFilter(t)}
            >
              {ROUTE_TYPE_ICONS[t] || "🚌"} {ROUTE_TYPE_NAMES[t] || "Transit"}
            </button>
          ))}
        </div>
      )}

      <div className="sort-row">
        <span className="sort-label">Sort</span>
        {SORT_BUTTONS.map((b) => (
          <button
            key={b.key}
            className={`sort-btn ${sort === b.key ? "sort-active" : ""}`}
            onClick={() => setSort(b.key)}
          >
            {b.label}
          </button>
        ))}
        <span className="route-count">{filtered.length}</span>
      </div>

      <div className="route-items">
        {filtered.map((route) => {
          const c = completionMap[route.id];
          const pct = c?.pct ?? 0;
          const isSelected = selectedRoute?.id === route.id;
          const isComplete = pct >= 100;
          return (
            <button
              key={route.id}
              type="button"
              className={`route-item ${isSelected ? "selected" : ""} ${isComplete ? "completed" : ""}`}
              onClick={() => onSelectRoute(isSelected ? null : route)}
            >
              <div
                className="route-badge"
                style={{
                  background: route.color
                    ? `linear-gradient(135deg, #${route.color}, #${route.color}dd)`
                    : "linear-gradient(135deg, #3b82f6, #2563eb)",
                  color: route.text_color ? `#${route.text_color}` : "#fff",
                }}
              >
                {route.short_name || "#"}
              </div>
              <div className="route-info">
                <div className="route-name" title={route.long_name}>
                  {route.long_name || route.short_name}
                </div>
                <div className="route-meta-line">
                  <span className="route-type">
                    {ROUTE_TYPE_ICONS[route.route_type] || "🚌"}{" "}
                    {ROUTE_TYPE_NAMES[route.route_type] || "Transit"}
                  </span>
                  {c && (
                    <span className="route-segs">
                      {c.completed}/{c.total}
                    </span>
                  )}
                </div>
                <div className="route-progress-track">
                  <div
                    className={`route-progress-fill ${isComplete ? "is-complete" : ""}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
              <div className="route-pct-col">
                {isComplete ? (
                  <span className="route-complete-badge">✓</span>
                ) : pct > 0 ? (
                  <span className="route-pct">{Math.round(pct)}%</span>
                ) : (
                  <span className="route-pct route-pct-empty">—</span>
                )}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🗺️</div>
            <div>No routes match your filters</div>
            <button
              className="empty-state-action"
              onClick={() => {
                setSearch("");
                setFilter("all");
                setTypeFilter("all");
              }}
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RouteList;
