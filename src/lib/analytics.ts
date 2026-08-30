/* Grain Studio product analytics.

   Design constraints, in priority order:

   1. The image never leaves the browser, and neither does anything derived from
      it. No filename, byte size, pixel dimensions, MIME type, or canvas data is
      ever collected. Only the chosen effect, its settings, and coarse session
      context are sent.
   2. Every event name and every property name is allowlisted below. Anything
      not on the list is dropped by `buildPayload` rather than trusted, so a
      future careless call site cannot widen the payload by accident.
   3. No third-party script and no cookies. We POST JSON directly to the
      self-hosted PostHog capture endpoint. Nothing is loaded from a vendor CDN,
      which keeps the local-only trust story of the product intact.
   4. Opt out is respected: Do Not Track, Global Privacy Control, or the
      `grain-studio-analytics-optout` local storage flag disables collection.
   5. Failure is silent. Analytics must never surface an error or block a render.

   The project is the same self-hosted PostHog project used by harshith.com, so
   site traffic and app usage land in one place and can be compared. The `site`
   property separates them. */

const HOST = (import.meta.env.VITE_POSTHOG_HOST || "https://signal.harshith.com").replace(/\/+$/, "");
const KEY = import.meta.env.VITE_POSTHOG_KEY || "phc_ndy4vZprPzDAUPrx6EU7qokYuMPVQrbiH8YkVkpDnSPD";
const SITE = "grainstudio";
const VISITOR_KEY = "grain-studio-visitor";
const SESSION_KEY = "grain-studio-session";
const EXPORTED_KEY = "grain-studio-has-exported";
const OPTOUT_KEY = "grain-studio-analytics-optout";
const DEBUG_KEY = "grain-studio-analytics-debug";

/* Local previews of a production build would otherwise report as production
   traffic and pollute the funnel, so localhost is excluded. Setting
   `grain-studio-analytics-debug` to "1" re-enables sending for deliberate
   verification and labels those events `environment: verification`. */
export const isLocalHost = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname.endsWith(".local");

/* Stages of the growth equation this product can actually observe.
   traffic -> exploration -> intent -> value -> loop supply -> loop demand */
export const EVENTS = [
  "app_opened",
  "effect_applied",
  "custom_image_selected",
  "export_completed",
  "recipe_copied",
  "recipe_link_opened",
] as const;

export type EventName = (typeof EVENTS)[number];

export const ALLOWED_PROPERTIES = [
  // session context
  "site",
  "environment",
  "session_id",
  "is_returning",
  "viewport_bucket",
  // channel attribution, for per-channel economics
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer_host",
  "referrer_class",
  // product context: effect and settings only, never image data
  "effect_id",
  "effect_category",
  "palette",
  "recipe",
  "source_kind",
  "is_first_export",
  "export_format",
  "export_size",
  "adjusted",
] as const;

/* Property names that must never appear, even if a call site tries. Asserted in
   tests so the guarantee is enforced rather than merely documented. */
export const FORBIDDEN_PROPERTIES = [
  "file_name",
  "filename",
  "name",
  "image_name",
  "bytes",
  "file_size",
  "width",
  "height",
  "dimensions",
  "mime_type",
  "data_url",
  "canvas",
  "src",
  "url",
  "href",
  "path",
  "query",
  "search",
  "email",
] as const;

const allowed = new Set<string>(ALLOWED_PROPERTIES);

export type EventProperties = Record<string, string | number | boolean | undefined>;

/* Pure and exported so the allowlist can be tested without a browser. */
export function buildPayload(event: EventName, properties: EventProperties): Record<string, unknown> {
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!allowed.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.length === 0) continue;
    clean[key] = typeof value === "string" ? value.slice(0, 96) : value;
  }
  return { event, properties: clean };
}

const storage = (kind: "local" | "session"): Storage | null => {
  try {
    const store = kind === "local" ? window.localStorage : window.sessionStorage;
    const probe = "__gs_probe__";
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
};

const optedOut = () => {
  try {
    if (navigator.doNotTrack === "1") return true;
    if ((navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl === true) return true;
    return storage("local")?.getItem(OPTOUT_KEY) === "1";
  } catch {
    return false;
  }
};

const randomId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `gs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
};

const readOrCreate = (store: Storage | null, key: string) => {
  if (!store) return randomId();
  const existing = store.getItem(key);
  if (existing) return existing;
  const created = randomId();
  store.setItem(key, created);
  return created;
};

export const viewportBucket = (width: number) => {
  if (width < 520) return "phone";
  if (width < 820) return "large-phone";
  if (width < 1180) return "tablet";
  return "desktop";
};

export const classifyReferrer = (referrer: string, currentHost: string) => {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host === currentHost.replace(/^www\./, "")) return "internal";
    if (host.endsWith("harshith.com")) return "owned";
    if (host.includes("producthunt")) return "producthunt";
    if (/google|bing|duckduckgo|ecosia|brave/.test(host)) return "search";
    if (/twitter|x\.com|linkedin|reddit|facebook|instagram|t\.co|news\.ycombinator/.test(host)) return "social";
    return "referral";
  } catch {
    return "unknown";
  }
};

export const referrerHost = (referrer: string) => {
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
};

type Context = {
  distinctId: string;
  sessionId: string;
  base: EventProperties;
};

let context: Context | null = null;
let enabled = false;

export function initAnalytics() {
  if (context) return;
  if (typeof window === "undefined") return;

  const local = storage("local");
  const debugging = local?.getItem(DEBUG_KEY) === "1";
  const local_host = isLocalHost(window.location.hostname);
  enabled = Boolean(KEY) && (import.meta.env.PROD || debugging) && (!local_host || debugging) && !optedOut();

  const session = storage("session");
  const isReturning = Boolean(local?.getItem(VISITOR_KEY));
  const params = new URLSearchParams(window.location.search);

  const environment = debugging ? "verification" : import.meta.env.PROD ? "production" : "development";

  context = {
    distinctId: readOrCreate(local, VISITOR_KEY),
    sessionId: readOrCreate(session, SESSION_KEY),
    base: {
      site: SITE,
      environment,
      is_returning: isReturning,
      viewport_bucket: viewportBucket(window.innerWidth),
      utm_source: params.get("utm_source") ?? undefined,
      utm_medium: params.get("utm_medium") ?? undefined,
      utm_campaign: params.get("utm_campaign") ?? undefined,
      utm_content: params.get("utm_content") ?? undefined,
      utm_term: params.get("utm_term") ?? undefined,
      referrer_host: referrerHost(document.referrer),
      referrer_class: classifyReferrer(document.referrer, window.location.hostname),
    },
  };
}

export function track(event: EventName, properties: EventProperties = {}) {
  if (!context) initAnalytics();
  if (!enabled || !context) return;

  const payload = buildPayload(event, { ...context.base, ...properties, session_id: context.sessionId });

  try {
    void fetch(`${HOST}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ api_key: KEY, distinct_id: context.distinctId, ...payload }),
    }).catch(() => undefined);
  } catch {
    // Measurement must never interrupt the product.
  }
}

/* First-export detection is persisted so activation can be distinguished from
   repeat use across sessions. Stores a single flag, no history. */
export function markExported() {
  try {
    storage("local")?.setItem(EXPORTED_KEY, "1");
  } catch {
    // Ignore storage failures; the event still reports is_first_export.
  }
}

export function hasExportedBefore() {
  try {
    return storage("local")?.getItem(EXPORTED_KEY) === "1";
  } catch {
    return false;
  }
}
