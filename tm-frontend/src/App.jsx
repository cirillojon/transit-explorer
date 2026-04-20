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

        <div className="sidebar-footer">
          <a
            href="https://github.com/cirillojon/transit-explorer"
            target="_blank"
            rel="noopener noreferrer"
            className="source-link"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Source on GitHub
          </a>
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
