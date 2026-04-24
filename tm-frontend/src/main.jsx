import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./index.css";
import { initSentry } from "./sentry.js";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// Initialize Sentry before any React rendering so early errors are captured.
initSentry();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
