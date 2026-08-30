/* Guards against source-level assumptions that pass locally but break in CI.

   Motivation: a test once imported `node:fs`, which type-checked on a developer
   machine only because `@types/node` happened to resolve from a parent directory
   outside the repository. Vercel and GitHub Actions have no such parent, so
   `tsc -b` failed there and the deployment errored. These assertions make that
   asymmetry impossible to reintroduce. */

import { describe, expect, it } from "vitest";

const sources = import.meta.glob("./**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

describe("build constraints", () => {
  it("has source files to inspect", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(5);
  });

  it("never imports a Node builtin, because @types/node is not a dependency", () => {
    const offenders = Object.entries(sources)
      .filter(([, code]) => /from\s+["']node:[a-z_/]+["']|require\(["']node:/.test(code))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it("keeps the browser bundle free of server-only globals", () => {
    const offenders = Object.entries(sources)
      .filter(([path]) => !path.includes(".test."))
      .filter(([, code]) => /\bprocess\.env\b|\b__dirname\b|\brequire\(/.test(code))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});
