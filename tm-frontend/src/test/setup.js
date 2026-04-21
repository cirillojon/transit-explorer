import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Stub Firebase env vars so src/firebase.js doesn't throw on import.
const FIREBASE_STUBS = {
  VITE_FIREBASE_API_KEY: "test-api-key",
  VITE_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "test-project",
  VITE_FIREBASE_STORAGE_BUCKET: "test.appspot.com",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
  VITE_FIREBASE_APP_ID: "1:1234567890:web:abcdef",
};
for (const [k, v] of Object.entries(FIREBASE_STUBS)) {
  if (!import.meta.env[k]) import.meta.env[k] = v;
}

// Mock the firebase modules so initializeApp doesn't actually contact Google.
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
}));
vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn((_, cb) => {
    cb(null);
    return () => {};
  }),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));
