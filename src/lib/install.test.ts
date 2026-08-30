import { describe, expect, it } from "vitest";
import { detectIosSafari, installOfferKind, type InstallContext } from "./install";

const context = (overrides: Partial<InstallContext> = {}): InstallContext => ({
  hasNativePrompt: false,
  isStandalone: false,
  isIosSafari: false,
  declined: false,
  ...overrides,
});

describe("install offer decision", () => {
  it("prefers a real prompt when the browser supports one", () => {
    expect(installOfferKind(context({ hasNativePrompt: true }))).toBe("native");
  });

  it("falls back to instructions on iOS Safari, where no prompt event exists", () => {
    expect(installOfferKind(context({ isIosSafari: true }))).toBe("manual");
  });

  it("offers nothing when the app is already installed", () => {
    expect(installOfferKind(context({ hasNativePrompt: true, isStandalone: true }))).toBe("none");
    expect(installOfferKind(context({ isIosSafari: true, isStandalone: true }))).toBe("none");
  });

  it("never nags once the offer has been declined", () => {
    expect(installOfferKind(context({ hasNativePrompt: true, declined: true }))).toBe("none");
    expect(installOfferKind(context({ isIosSafari: true, declined: true }))).toBe("none");
  });

  it("stays silent on a browser that cannot install at all", () => {
    expect(installOfferKind(context())).toBe("none");
  });
});

describe("iOS Safari detection", () => {
  it("recognises Safari on iPhone and iPad", () => {
    expect(detectIosSafari("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1")).toBe(true);
    expect(detectIosSafari("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1")).toBe(true);
  });

  it("excludes other iOS browsers, which cannot install either", () => {
    expect(detectIosSafari("Mozilla/5.0 (iPhone) CriOS/120.0 Mobile Safari/604.1")).toBe(false);
    expect(detectIosSafari("Mozilla/5.0 (iPhone) FxiOS/120.0 Mobile Safari/604.1")).toBe(false);
    expect(detectIosSafari("Mozilla/5.0 (iPhone) EdgiOS/120.0 Mobile Safari/604.1")).toBe(false);
  });

  it("excludes desktop and Android", () => {
    expect(detectIosSafari("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.0 Safari/605.1.15")).toBe(false);
    expect(detectIosSafari("Mozilla/5.0 (Linux; Android 14) Chrome/120.0 Mobile Safari/537.36")).toBe(false);
  });
});
