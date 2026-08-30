/* Contextual install.

   The app previously exposed a permanent "Install" affordance in the header,
   which asked for commitment before the product had proved anything. This offers
   installation once, immediately after someone exports a treatment of their own
   image, which is the first moment the value is real.

   Two paths are needed because they are genuinely different. Chromium fires
   `beforeinstallprompt`, so a real prompt can be shown. iOS Safari never fires
   it and installation is only possible through Share, then Add to Home Screen,
   so there the honest thing is a short instruction rather than a dead button.

   `installOfferKind` is pure so the whole decision matrix is testable, and a
   declined offer is remembered so the product never nags. */

export const INSTALL_DECLINED_KEY = "grain-studio-install-declined";

export type InstallOfferKind = "native" | "manual" | "none";

export type InstallContext = {
  /* A beforeinstallprompt event is held and can still be used. */
  hasNativePrompt: boolean;
  /* Already running as an installed app, so there is nothing to offer. */
  isStandalone: boolean;
  /* iOS Safari, where installation exists but only through the Share sheet. */
  isIosSafari: boolean;
  declined: boolean;
};

export function installOfferKind(context: InstallContext): InstallOfferKind {
  if (context.isStandalone) return "none";
  if (context.declined) return "none";
  if (context.hasNativePrompt) return "native";
  if (context.isIosSafari) return "manual";
  return "none";
}

const storage = (): Storage | null => {
  try {
    const probe = "__gs_install_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
};

export function hasDeclinedInstall(): boolean {
  try {
    return storage()?.getItem(INSTALL_DECLINED_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberInstallDeclined(): void {
  try {
    storage()?.setItem(INSTALL_DECLINED_KEY, "1");
  } catch {
    // Never block the editor over a storage failure.
  }
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    // iOS Safari reports installation through a non-standard flag.
    return (window.navigator as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

export function detectIosSafari(userAgent: string): boolean {
  const isIos = /iphone|ipad|ipod/i.test(userAgent);
  if (!isIos) return false;
  // Chrome and Firefox on iOS identify themselves and cannot install either.
  return !/crios|fxios|edgios/i.test(userAgent);
}
