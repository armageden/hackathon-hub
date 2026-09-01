import "@testing-library/jest-dom/vitest";

// Node >=26 ships a global `localStorage`/`sessionStorage` that returns
// undefined without --localstorage-file. It also shadows jsdom's real Storage,
// because vitest skips copying window keys that already exist on the global.
// vitest exposes the actual JSDOM instance as `globalThis.jsdom`, so graft its
// working Storage back onto the test globals when the built-in is inert.
const domWindow = (globalThis as Record<string, any>).jsdom?.window;
if (domWindow) {
  for (const key of ["localStorage", "sessionStorage"] as const) {
    if (typeof (globalThis as Record<string, any>)[key]?.getItem !== "function" && domWindow[key]) {
      Object.defineProperty(globalThis, key, { value: domWindow[key], configurable: true });
    }
  }
}

import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom doesn't implement ResizeObserver (VenuePage uses it to size the
// venue map canvas to its container). Stub it with a no-op recorder.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.ResizeObserver === "undefined") {
  (globalThis as Record<string, unknown>).ResizeObserver = ResizeObserverStub;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
