import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: { isLoaded: true, isSignedIn: false }, pathname: "/sign-in", visible: false,
  effect: vi.fn(), setVisible: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => mocks.auth }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useEffect: mocks.effect,
  useState: () => [mocks.visible, mocks.setVisible],
}));

import { SignInToast } from "@/components/auth/sign-in-toast";

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.auth = { isLoaded: true, isSignedIn: false };
  mocks.pathname = "/sign-in";
  mocks.visible = false;
  const storage = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal("window", globalThis);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function render() {
  mocks.effect.mockClear();
  const html = renderToStaticMarkup(SignInToast());
  const cleanup = mocks.effect.mock.calls.map(([effect]) => effect());
  return { html, cleanup: () => cleanup.forEach((fn) => fn?.()) };
}

it("announces successful sign-in once across the OAuth page reload", () => {
  render().cleanup();
  expect(mocks.setVisible).not.toHaveBeenCalled();
  mocks.auth.isSignedIn = true;
  mocks.pathname = "/profile";
  render().cleanup(); // An interrupted render must not consume the notification.
  render();
  vi.runAllTimers();
  expect(mocks.setVisible).toHaveBeenCalledExactlyOnceWith(true);
  mocks.setVisible.mockClear();
  render();
  vi.runAllTimers();
  expect(mocks.setVisible).not.toHaveBeenCalled();
});

it("does not announce an existing session or an unfinished sign-in", () => {
  mocks.auth.isSignedIn = true;
  render();
  vi.runAllTimers();
  expect(mocks.setVisible).not.toHaveBeenCalled();
  mocks.auth = { isLoaded: false, isSignedIn: false };
  render();
  mocks.auth = { isLoaded: true, isSignedIn: true };
  render();
  vi.runAllTimers();
  expect(mocks.setVisible).not.toHaveBeenCalled();
});

it("keeps the open-source invitation available until dismissed or opened", () => {
  mocks.visible = true;
  mocks.auth.isSignedIn = true;
  const { html } = render();
  expect(html).toContain('aria-live="polite"');
  expect(html).toContain('aria-label="Dismiss notification"');
  expect(html).toContain('data-slot="system-alert-banner"');
  expect(html).toContain('We’re open source, give us a ⭐ to help us grow!');
  expect(html).toContain('href="https://github.com/byalex33/maintain.help"');
  expect(html).toContain('rel="noopener noreferrer"');
  vi.advanceTimersByTime(60_000);
  expect(mocks.setVisible).not.toHaveBeenCalled();
  const alert = SignInToast().props.children;
  alert.props.children[3].props.onClick();
  expect(mocks.setVisible).toHaveBeenLastCalledWith(false);
  mocks.setVisible.mockClear();
  alert.props.children[4].props.onClick();
  expect(mocks.setVisible).toHaveBeenLastCalledWith(false);
});

it("does not break sign-in when browser storage is disabled", () => {
  vi.stubGlobal("sessionStorage", { setItem: () => { throw new Error("Storage disabled"); } });
  expect(() => render()).not.toThrow();
});
