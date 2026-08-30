import { describe, expect, it } from "vitest";
import { experienceForPath, studioHref } from "./navigation";

describe("product-site navigation", () => {
  it("keeps the marketing page at the root and the editor at /app", () => {
    expect(experienceForPath("/")).toBe("landing");
    expect(experienceForPath("/app")).toBe("studio");
    expect(studioHref()).toBe("/app");
  });

  it("treats unknown paths as the product page instead of a broken editor state", () => {
    expect(experienceForPath("/anything-else")).toBe("landing");
  });
});
