import "@testing-library/jest-dom/vitest";

// Minimal DOM polyfills used by some components.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-expect-error - test env polyfill
globalThis.ResizeObserver = ResizeObserverStub;

// @ts-expect-error - test env polyfill
globalThis.matchMedia =
  globalThis.matchMedia ??
  ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    }
  }));

