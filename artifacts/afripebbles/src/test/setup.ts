import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
  // The guest cart persists to localStorage — without this, cart state leaks
  // across tests within the same file (jsdom's localStorage isn't reset
  // between tests automatically).
  localStorage.clear();
});

// jsdom doesn't implement these — framer-motion's `whileInView` and several
// Radix primitives (Select, Tabs) rely on them being present.
class MockObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IntersectionObserver ??= MockObserver;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver ??= MockObserver;

// jsdom doesn't implement the Pointer Events capture API or scrollIntoView,
// which Radix Select/Dropdown need when a real click opens the popup.
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
