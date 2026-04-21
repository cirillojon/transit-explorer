import React, { useCallback, useEffect, useState } from "react";
import TransitMap from "./components/TransitMap";
import RouteList from "./components/RouteList";
import UserProgress from "./components/UserProgress";
import Leaderboard from "./components/Leaderboard";
import {
  fetchRoutes,
  fetchProgress,
  fetchMe,
  fetchStats,
  fetchActivity,
} from "./services/api";
import { useAuth } from "./contexts/AuthContext";

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

  const pushToast = useCallback((msg) => {
    const id = Date.now() + Math.random();
    setPopupToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setPopupToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const handleViewSegment = useCallback(
    (routeId, seg) => {
      const route = routes.find((r) => r.id === routeId);
      if (route) {
        setSelectedRoute(route);
        setActiveTab("routes");
      }
      setHighlightedSegment({
        routeId,
        directionId: seg.direction_id,
        fromStopId: seg.from_stop_id,
        toStopId: seg.to_stop_id,
      });
      setSidebarOpen(false);
    },
    [routes],
  );

  const handleSelectRoute = useCallback((route) => {
    setSelectedRoute(route);
    if (route) setSidebarOpen(false);
  }, []);

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
      console.error("Failed to load user data:", err);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    let timer;
    const loadRoutes = async () => {
      try {
        setLoading(true);
        setError(null);
        const routesData = await fetchRoutes();
        if (cancelled) return;
        if (!routesData?.length) {
          setError("Transit data is loading on the server. Retrying…");
          setLoading(false);
          timer = setTimeout(() => !cancelled && loadRoutes(), 5000);
          return;
        }
        setRoutes(routesData);
      } catch {
        if (cancelled) return;
        setError("Transit data is loading on the server. Retrying…");
        setLoading(false);
        timer = setTimeout(() => !cancelled && loadRoutes(), 5000);
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
          <span className="name">
            {selectedRoute.short_name || selectedRoute.long_name}
          </span>
          {selectedRoute.short_name && selectedRoute.long_name && (
            <span className="sub">{selectedRoute.long_name}</span>
          )}
          <span
            className="clear"
            role="button"
            aria-label="Clear selected route"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRoute(null);
            }}
          >
            ✕
          </span>
        </button>
      )}

      {sidebarOpen && (
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
                alt=""
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
            <RouteList
              routes={routes}
              progress={progress}
              selectedRoute={selectedRoute}
              onSelectRoute={handleSelectRoute}
            />
          )}

          {activeTab === "progress" && (
            <UserProgress
              progress={progress}
              stats={stats}
              profile={profile}
              activity={activity}
              onRefresh={loadUserData}
              onViewSegment={handleViewSegment}
            />
          )}

          {activeTab === "leaderboard" && (
            <Leaderboard currentUserStats={stats} />
          )}
        </div>
      </aside>

      <TransitMap
        routes={routes}
        selectedRoute={selectedRoute}
        completedSegments={completedSegments}
        onSegmentsMarked={loadUserData}
        highlightedSegment={highlightedSegment}
        onClearHighlight={() => setHighlightedSegment(null)}
        onUnlockToast={pushToast}
      />

      {/* Stacked achievement popup toasts */}
      <div className="popup-toast-stack">
        {popupToasts.map((t) => (
          <div key={t.id} className="popup-toast">
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
