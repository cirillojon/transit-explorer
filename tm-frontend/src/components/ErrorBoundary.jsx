import React from "react";

/**
 * App-level error boundary. Catches render-time exceptions from any descendant,
 * shows a user-friendly fallback, and lets the user try to recover by reloading.
 *
 * Note: this only catches errors thrown during render / lifecycle methods.
 * Async errors (e.g., from fetch) need to be handled in their own .catch().
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Surface to the developer console; in production this still goes to
    // the browser console where users can copy it for bug reports. Hook in
    // a real error tracker (Sentry, etc.) here later if desired.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("Uncaught error:", error, info);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            background: "#0b1220",
            color: "#e6edf6",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚧</div>
            <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.5rem" }}>
              Something went wrong
            </h1>
            <p style={{ margin: "0 0 1.5rem", opacity: 0.8 }}>
              The app hit an unexpected error. Reloading usually fixes it.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                background: "#3b82f6",
                color: "#fff",
                border: 0,
                borderRadius: 6,
                padding: "0.6rem 1.25rem",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
