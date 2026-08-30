import { describe, expect, it } from "vitest";
import {
  ALLOWED_PROPERTIES,
  EVENTS,
  FORBIDDEN_PROPERTIES,
  buildPayload,
  classifyReferrer,
  isLocalHost,
  referrerHost,
  viewportBucket,
} from "./analytics";

describe("analytics payload safety", () => {
  it("drops every property that is not explicitly allowlisted", () => {
    const { properties } = buildPayload("export_completed", {
      effect_id: "riso-print",
      not_on_the_list: "should vanish",
      another_stray: 42,
    });
    expect(properties).toEqual({ effect_id: "riso-print" });
  });

  it("can never emit an image-identifying property, even when a call site tries", () => {
    const hostile: Record<string, string | number> = {};
    for (const key of FORBIDDEN_PROPERTIES) hostile[key] = "leaked-value";
    const { properties } = buildPayload("export_completed", hostile);
    expect(Object.keys(properties as object)).toHaveLength(0);
  });

  it("keeps the allowlist and the forbidden list disjoint", () => {
    const overlap = ALLOWED_PROPERTIES.filter((key) => (FORBIDDEN_PROPERTIES as readonly string[]).includes(key));
    expect(overlap).toEqual([]);
  });

  it("omits empty and undefined values rather than sending blanks", () => {
    const { properties } = buildPayload("app_opened", {
      site: "grainstudio",
      utm_source: "",
      utm_medium: undefined,
    });
    expect(properties).toEqual({ site: "grainstudio" });
  });

  it("truncates long strings so no property can carry a payload", () => {
    const { properties } = buildPayload("app_opened", { utm_campaign: "x".repeat(500) });
    expect((properties as { utm_campaign: string }).utm_campaign).toHaveLength(96);
  });

  it("covers the full growth-equation funnel with named events", () => {
    expect(EVENTS).toEqual([
      "app_opened",
      "effect_applied",
      "custom_image_selected",
      "export_completed",
      "look_saved",
      "saved_look_opened",
      "recipe_copied",
      "recipe_link_opened",
    ]);
  });
});

describe("channel attribution", () => {
  it("classifies the channels we actually plan to test", () => {
    expect(classifyReferrer("", "grainstudio.harshith.com")).toBe("direct");
    expect(classifyReferrer("https://www.producthunt.com/posts/x", "grainstudio.harshith.com")).toBe("producthunt");
    expect(classifyReferrer("https://www.harshith.com/apps", "grainstudio.harshith.com")).toBe("owned");
    expect(classifyReferrer("https://www.google.com/", "grainstudio.harshith.com")).toBe("search");
    expect(classifyReferrer("https://x.com/harshithio", "grainstudio.harshith.com")).toBe("social");
    expect(classifyReferrer("https://example.dev/blog", "grainstudio.harshith.com")).toBe("referral");
    expect(classifyReferrer("not a url", "grainstudio.harshith.com")).toBe("unknown");
  });

  it("reduces a referrer to a bare host and never a full path", () => {
    expect(referrerHost("https://www.producthunt.com/posts/grain-studio?ref=abc")).toBe("producthunt.com");
    expect(referrerHost("garbage")).toBeUndefined();
  });

  it("buckets viewports instead of reporting exact pixel sizes", () => {
    expect(viewportBucket(390)).toBe("phone");
    expect(viewportBucket(768)).toBe("large-phone");
    expect(viewportBucket(1024)).toBe("tablet");
    expect(viewportBucket(1440)).toBe("desktop");
  });
});

describe("environment gating", () => {
  it("treats local development hosts as non-production", () => {
    expect(isLocalHost("localhost")).toBe(true);
    expect(isLocalHost("127.0.0.1")).toBe(true);
    expect(isLocalHost("[::1]")).toBe(true);
    expect(isLocalHost("studio.local")).toBe(true);
    expect(isLocalHost("grainstudio.harshith.com")).toBe(false);
  });
});
