import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HelpModal from "../components/HelpModal";

/**
 * Helpers to override navigator properties for platform-detection tests.
 * We restore originals after each test so tests remain isolated.
 */
function setNavigator({ userAgent, platform, maxTouchPoints }) {
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: userAgent ?? navigator.userAgent,
  });
  Object.defineProperty(navigator, "platform", {
    configurable: true,
    value: platform ?? navigator.platform,
  });
  Object.defineProperty(navigator, "maxTouchPoints", {
    configurable: true,
    value: maxTouchPoints ?? 0,
  });
}

const defaultProps = {
  open: true,
  onClose: () => {},
  onDontShowAgain: () => {},
  showDontShowAgain: false,
};

describe("HelpModal platform detection", () => {
  afterEach(() => {
    // Reset to desktop-like defaults between tests
    setNavigator({ userAgent: "Mozilla/5.0", platform: "Win32", maxTouchPoints: 0 });
  });

  it("shows iOS install tip on iPhone user-agent", () => {
    setNavigator({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    render(<HelpModal {...defaultProps} />);
    expect(screen.getByText(/Add to Home Screen \(iOS\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Add to Home Screen \(Android\)/i)).not.toBeInTheDocument();
  });

  it("shows iOS install tip on modern iPad (MacIntel + maxTouchPoints > 1)", () => {
    setNavigator({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      platform: "MacIntel",
      maxTouchPoints: 5,
    });
    render(<HelpModal {...defaultProps} />);
    expect(screen.getByText(/Add to Home Screen \(iOS\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Add to Home Screen \(Android\)/i)).not.toBeInTheDocument();
  });

  it("shows Android install tip on Android user-agent", () => {
    setNavigator({
      userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7)",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    });
    render(<HelpModal {...defaultProps} />);
    expect(screen.getByText(/Add to Home Screen \(Android\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Add to Home Screen \(iOS\)/i)).not.toBeInTheDocument();
  });

  it("shows no install tip on desktop", () => {
    setNavigator({ userAgent: "Mozilla/5.0", platform: "Win32", maxTouchPoints: 0 });
    render(<HelpModal {...defaultProps} />);
    expect(screen.queryByText(/Add to Home Screen/i)).not.toBeInTheDocument();
  });
});

describe("HelpModal general rendering", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<HelpModal {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the modal when open", () => {
    render(<HelpModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/How to log a ride/i)).toBeInTheDocument();
  });

  it("shows 'Don't show this again' button when showDontShowAgain is true", () => {
    render(<HelpModal {...defaultProps} showDontShowAgain />);
    expect(
      screen.getByRole("button", { name: /don't show this again/i })
    ).toBeInTheDocument();
  });

  it("hides 'Don't show this again' button when showDontShowAgain is false", () => {
    render(<HelpModal {...defaultProps} showDontShowAgain={false} />);
    expect(
      screen.queryByRole("button", { name: /don't show this again/i })
    ).not.toBeInTheDocument();
  });
});
