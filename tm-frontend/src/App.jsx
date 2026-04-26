import React, { useCallback, useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import TransitMap from "./components/TransitMap";
import RouteList from "./components/RouteList";
import UserProgress from "./components/UserProgress";
import Leaderboard from "./components/Leaderboard";
import PublicProfile from "./components/PublicProfile";
import ErrorBoundary from "./components/ErrorBoundary";
import {
  fetchRoutes,
  fetchProgress,
  fetchMe,
  fetchStats,
  fetchActivity,
  fetchRouteDetail,
} from "./services/api";
import { useAuth } from "./contexts/AuthContext";

function cleanLabel(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getRouteDisplayText(route) {
  const shortName = cleanLabel(route?.short_name);
  const longName = cleanLabel(route?.long_name);
  const description = cleanLabel(route?.description);

  const shortNorm = shortName.toLowerCase();
  const longNorm = longName.toLowerCase();
  const descNorm = description.toLowerCase();

  const hasLongDistinct = !!longName && longNorm !== shortNorm;
  const hasDescDistinctFromShort = !!description && descNorm !== shortNorm;
  const hasDescDistinctFromLong = !!description && descNorm !== longNorm;

  const primary = hasLongDistinct
    ? longName
    : hasDescDistinctFromShort
      ? description
      : longName || shortName || "Route";

  let secondary = "";
  if (primary === longName && hasDescDistinctFromLong) secondary = description;
  if (primary === description && hasLongDistinct) secondary = longName;

  if (!secondary && shortName && primary.toLowerCase() !== shortNorm) {
    secondary = `Route ${shortName}`;
  }

  return { primary, secondary };
}

function App() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("routes");
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [progress, setProgress] = useState([]);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedSegment, setHighlightedSegment] = useState(null);
  const [popupToasts, setPopupToasts] = useState([]); // achievement-style stacked
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [viewingUser, setViewingUser] = useState(null); // public profile modal
  const [allProgressDetails, setAllProgressDetails] = useState(null); // "view all routes" mode

  const pushToast = useCallback((msg) => {
    const id = Date.now() + Math.random();
    setPopupToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setPopupToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const handleViewSegment = useCallback(
    (routeId, seg) => {
      const route = routes.find((r) => r.id === routeId);
      if (route) {
        // Load the route on the map but DO NOT switch the sidebar tab —
        // the user clicked from Progress (or Recent activity) and expects
        // to stay there. The map is always visible anyway.
        setSelectedRoute(route);
      }
      setHighlightedSegment({
        routeId,
        directionId: seg.direction_id,
        fromStopId: seg.from_stop_id,
        toStopId: seg.to_stop_id,
      });
      // On mobile the sidebar is a drawer over the map; close it so the
      // highlighted segment is actually visible. No-op on desktop.
      setSidebarOpen(false);
    },
    [routes],
  );

  const handleSelectRoute = useCallback((route) => {
    setSelectedRoute(route);
    if (route) {
      setSidebarOpen(false);
      setAllProgressDetails(null);
    }
  }, []);

  const handleSelectRouteFromProgress = useCallback(
    (routeId) => {
      if (!routeId) {
        setSelectedRoute(null);
        return;
      }
      const route = routes.find((r) => r.id === routeId);
      if (route) {
        setSelectedRoute(route);
        setAllProgressDetails(null);
        // Keep the sidebar open on mobile — the user wants the route highlighted
        // on the map but shouldn't lose the in-progress details card.
      }
    },
    [routes],
  );

  const loadUserData = useCallback(async () => {
    if (!user) return;
    try {
      const [prog, me, st, act] = await Promise.all([
        fetchProgress(),
        fetchMe(),
        fetchStats(),
        fetchActivity(20),
      ]);
      setProgress(prog);
      setProfile(me);
      setStats(st);
      setActivity(act);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Failed to load user data:", err);
      }
    }
  }, [user]);

  // Called by TransitMap after a segment is successfully marked.
  // Immediately merges the newly created segments into `progress` (using the
  // exact same key format as `completedSegments`) so the map stays green
  // without waiting for a full server round-trip. The full refresh runs in
  // the background to pick up accurate completion stats, achievements, etc.
  const handleSegmentsMarked = useCallback(
    (result) => {
      if (result?.segments?.length) {
        setProgress((prev) => {
          const newSegs = result.segments;
          const byRoute = {};
          for (const seg of newSegs) {
            if (!byRoute[seg.route_id]) byRoute[seg.route_id] = [];
            byRoute[seg.route_id].push(seg);
          }
          return prev.map((rp) => {
            const extra = byRoute[rp.route_id];
            if (!extra) return rp;
            const existingKeys = new Set(
              rp.segments.map(
                (s) => `${s.direction_id}|${s.from_stop_id}|${s.to_stop_id}`,
              ),
            );
            const toAdd = extra.filter(
              (s) =>
                !existingKeys.has(
                  `${s.direction_id}|${s.from_stop_id}|${s.to_stop_id}`,
                ),
            );
            return toAdd.length
              ? { ...rp, segments: [...rp.segments, ...toAdd] }
              : rp;
          });
        });
      }
      // Full refresh for accurate completion %, rank, activity feed, etc.
      loadUserData();
    },
    [loadUserData],
  );

  const handleShowAllProgressRoutes = useCallback(async () => {
    if (!progress.length) return;
    const results = await Promise.allSettled(
      progress.map((rp) => fetchRouteDetail(rp.route_id)),
    );
    const details = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);
    const failedCount = results.length - details.length;

    if (details.length) {
      setAllProgressDetails(details);
      setSelectedRoute(null);
      setHighlightedSegment(null);
      setSidebarOpen(false);
    }

    if (failedCount > 0) {
      setError(
        details.length
          ? `Some route details could not be loaded (${failedCount} failed).`
          : "Unable to load route details right now.",
      );
    } else {
      setError(null);
    }
  }, [progress]);

  useEffect(() => {
    let cancelled = false;
    let timer;
    let attempt = 0;
    const MAX_ATTEMPTS = 8;
    const BASE_DELAY = 3000;
    const MAX_DELAY = 60000;
    const scheduleRetry = () => {
      attempt += 1;
      if (attempt >= MAX_ATTEMPTS) {
        setError(
          "Transit data is taking longer than expected to load. Please refresh the page to try again.",
        );
        setLoading(false);
        return;
      }
      // Exponential backoff with jitter: 3s, 6s, 12s, 24s … capped at 60s.
      const exp = Math.min(BASE_DELAY * 2 ** (attempt - 1), MAX_DELAY);
      const delay = exp / 2 + Math.random() * (exp / 2);
      timer = setTimeout(() => !cancelled && loadRoutes(), delay);
    };
    const loadRoutes = async () => {
      try {
        setLoading(true);
        setError(null);
        const routesData = await fetchRoutes();
        if (cancelled) return;
        if (!routesData?.length) {
          setError("Transit data is loading on the server. Retrying…");
          setLoading(false);
          scheduleRetry();
          return;
        }
        attempt = 0;
        setRoutes(routesData);
      } catch {
        if (cancelled) return;
        setError("Transit data is loading on the server. Retrying…");
        setLoading(false);
        scheduleRetry();
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadRoutes();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (user) loadUserData();
  }, [user, loadUserData]);

  // The "📍 Viewing segment from progress" banner only makes sense while the
  // user is still on the Progress tab looking at the highlighted route.
  // Clear it as soon as they navigate to another tab or switch to a route
  // other than the highlighted one — otherwise the banner sticks around
  // forever even though the context is gone.
  useEffect(() => {
    if (!highlightedSegment) return;
    if (activeTab !== "progress") {
      setHighlightedSegment(null);
      return;
    }
    if (selectedRoute && selectedRoute.id !== highlightedSegment.routeId) {
      setHighlightedSegment(null);
    }
  }, [activeTab, selectedRoute, highlightedSegment]);

  if (authLoading || loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="loading-spinner" />
          <span>Loading transit network…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app login-page">
        <div className="login-card">
          <div className="login-logo">🚌</div>
          <h1>Transit Explorer</h1>
          <p>
            Track every Seattle Metro and Sound Transit ride. Unlock segments,
            chase achievements, climb the leaderboard.
          </p>
          <button className="login-button" onClick={signIn}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path
                fill="#fff"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.71-1.57 2.7-3.9 2.7-6.62z"
              />
              <path
                fill="#fff"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.94v2.32A8.99 8.99 0 0 0 9 18z"
                opacity=".85"
              />
              <path
                fill="#fff"
                d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.94A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.94 4.04l3.03-2.33z"
                opacity=".7"
              />
              <path
                fill="#fff"
                d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A8.99 8.99 0 0 0 9 0 8.99 8.99 0 0 0 .94 4.96l3.03 2.33C4.68 5.16 6.66 3.58 9 3.58z"
                opacity=".55"
              />
            </svg>
            Sign in with Google
          </button>
          <div className="login-features">
            <div>🗺️ Interactive map of every route</div>
            <div>🏅 11 achievements to unlock</div>
            <div>🏆 Compete on the global leaderboard</div>
          </div>
          <a
            className="feedback-link login-feedback"
            href="https://github.com/cirillojon/transit-explorer/issues/new/choose"
            target="_blank"
            rel="noopener noreferrer"
          >
            🐛 Found a bug or have a suggestion?
          </a>
        </div>
      </div>
    );
  }

  // Set of completed segment keys for fast map lookups
  const completedSegments = new Set();
  for (const rp of progress) {
    for (const seg of rp.segments) {
      completedSegments.add(
        `${rp.route_id}|${seg.direction_id}|${seg.from_stop_id}|${seg.to_stop_id}`,
      );
    }
  }

  const selectedRouteDisplay = selectedRoute
    ? getRouteDisplayText(selectedRoute)
    : null;

  return (
    <div className={`app ${sidebarOpen ? "sidebar-open" : ""}`}>
      <button
        type="button"
        className="mobile-sidebar-toggle"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>

      {selectedRoute && !sidebarOpen && (
        <button
          type="button"
          className="mobile-current-route"
          onClick={() => setSidebarOpen(true)}
          aria-label="Show route details"
        >
          <span
            className="swatch"
            style={{
              background: selectedRoute.color
                ? `#${selectedRoute.color}`
                : "var(--accent)",
            }}
          />
          <span className="text">
            <span className="name">{selectedRouteDisplay?.primary}</span>
            {selectedRouteDisplay?.secondary && (
              <span className="sub">{selectedRouteDisplay.secondary}</span>
            )}
          </span>
          <span
            className="clear"
            role="button"
            tabIndex={0}
            aria-label="Clear selected route"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRoute(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                setSelectedRoute(null);
              }
            }}
          >
            ✕
          </span>
        </button>
      )}

      {sidebarOpen && (
        // Decorative backdrop — keyboard users close the sidebar via the
        // toolbar toggle button, not the backdrop itself.
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <span className="brand-icon">🚌</span>
            <div>
              <h1>Transit Explorer</h1>
              <p className="brand-sub">Seattle · Puget Sound</p>
            </div>
          </div>

          <div className="user-info">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={`${user.displayName || "You"} avatar`}
                className="avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="avatar avatar-placeholder">
                {(user.displayName || user.email || "?")[0].toUpperCase()}
              </div>
            )}
            <span className="user-name">{user.displayName || user.email}</span>
            <button className="sign-out-btn" onClick={signOut} title="Sign out">
              ⎋
            </button>
          </div>

          {profile && (
            <div className="user-stats-mini">
              <span>
                <strong>{profile.total_segments}</strong> segs
              </span>
              <span>
                <strong>{profile.total_routes}</strong> routes
              </span>
              {stats?.rank && (
                <span>
                  <strong>#{stats.rank}</strong> rank
                </span>
              )}
            </div>
          )}
        </div>

        <div className="sidebar-tabs">
          {[
            { key: "routes", label: "Routes", icon: "🚏" },
            { key: "progress", label: "Progress", icon: "📊" },
            { key: "leaderboard", label: "Top", icon: "🏆" },
          ].map((t) => (
            <button
              key={t.key}
              className={`tab-button ${activeTab === t.key ? "active" : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              <span className="tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="sidebar-content">
          {error && <div className="error">{error}</div>}

          {activeTab === "routes" && (
            <ErrorBoundary compact label="the route list">
              <RouteList
                routes={routes}
                progress={progress}
                selectedRoute={selectedRoute}
                onSelectRoute={handleSelectRoute}
              />
            </ErrorBoundary>
          )}

          {activeTab === "progress" && (
            <ErrorBoundary compact label="your progress">
              <UserProgress
                progress={progress}
                stats={stats}
                profile={profile}
                activity={activity}
                onRefresh={loadUserData}
                onViewSegment={handleViewSegment}
                highlightedSegment={highlightedSegment}
                onClearHighlight={() => setHighlightedSegment(null)}
                onShowAllRoutes={handleShowAllProgressRoutes}
                onSelectRoute={handleSelectRouteFromProgress}
                selectedRoute={selectedRoute}
              />
            </ErrorBoundary>
          )}

          {activeTab === "leaderboard" && (
            <ErrorBoundary compact label="the leaderboard">
              <Leaderboard
                currentUserStats={stats}
                onSelectUser={(entry) => setViewingUser(entry)}
              />
            </ErrorBoundary>
          )}
        </div>

        <div className="sidebar-footer">
          <a
            className="feedback-link"
            href="https://github.com/cirillojon/transit-explorer/issues/new/choose"
            target="_blank"
            rel="noopener noreferrer"
          >
            🐛 Found a bug or have a suggestion?
          </a>
        </div>
      </aside>

      <ErrorBoundary compact label="the map">
        <TransitMap
          selectedRoute={selectedRoute}
          completedSegments={completedSegments}
          onSegmentsMarked={handleSegmentsMarked}
          highlightedSegment={highlightedSegment}
          onClearHighlight={() => setHighlightedSegment(null)}
          onUnlockToast={pushToast}
          allProgressDetails={allProgressDetails}
          onClearAllProgress={() => setAllProgressDetails(null)}
        />
      </ErrorBoundary>

      {/* Stacked achievement popup toasts */}
      <div className="popup-toast-stack">
        {popupToasts.map((t) => (
          <div key={t.id} className="popup-toast">
            {t.msg}
          </div>
        ))}
      </div>

      {viewingUser && (
        <ErrorBoundary compact label="this profile">
          <PublicProfile
            userId={viewingUser.user_id}
            fallbackEntry={viewingUser}
            onClose={() => setViewingUser(null)}
          />
        </ErrorBoundary>
      )}
      <Analytics />
    </div>
  );
}

export default App;
