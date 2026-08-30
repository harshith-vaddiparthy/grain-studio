"""Activation audit for Grain Studio.

Implements the audit prescribed by the gtm-product-led-growth skill, Framework 4
(Time to First Value): open the product as a new user, time how long until first
value, count the steps to the aha moment, and record where a newcomer would get
stuck. Produces comparable numbers so an activation change can be judged rather
than assumed.

Two moments are measured separately, because they are different claims:
  - Time to first rendered treatment on the bundled sample (curiosity satisfied).
  - Time and steps to export a treatment of the user's OWN image, which is the
    real activation event the funnel counts.

Usage:
  python3 scripts/activation-audit.py [--url URL] [--label LABEL]
"""

import argparse
import json
import struct
import time
import zlib
from pathlib import Path

from playwright.sync_api import sync_playwright


def make_png(path: Path, width=640, height=480):
    """Write a small deterministic PNG so the audit needs no external fixture."""

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw += bytes(((x * 255) // width, (y * 255) // height, ((x + y) * 255) // (width + height)))
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 6))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)
    return path


def audit(url: str, label: str):
    fixture = make_png(Path("/tmp/activation-audit-source.png"))
    result = {"label": label, "url": url}

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(accept_downloads=True)
        # A genuinely new visitor: no storage, no prior worker, no cached build.
        page = context.new_page()

        started = time.perf_counter()
        page.goto(url, wait_until="commit", timeout=60000)

        # First value on the sample: the processed canvas has painted something.
        page.wait_for_selector("canvas", timeout=45000)
        page.wait_for_function(
            """() => {
                const c = document.querySelector('.stage-column canvas, canvas');
                if (!c || !c.width) return false;
                const ctx = c.getContext('2d');
                if (!ctx) return false;
                const d = ctx.getImageData(0, 0, Math.min(c.width, 40), Math.min(c.height, 40)).data;
                for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return true;
                return false;
            }""",
            timeout=45000,
        )
        result["seconds_to_sample_treatment"] = round(time.perf_counter() - started, 2)

        # How much choice is presented before the user has done anything?
        page.wait_for_selector(".texture-dock", timeout=20000)
        result["choices_visible_at_first_paint"] = page.locator(".texture-dock button[aria-pressed], .texture-dock button").count()
        result["filter_tabs"] = page.eval_on_selector_all(
            ".category-tabs button", "els => els.map(e => e.textContent.trim())"
        )
        result["effect_named_in_inspector"] = page.inner_text(".inspector h1").strip()
        # Does anything on screen say what this effect is in ordinary language?
        dock_text = page.inner_text(".texture-dock")
        plain_words = ["halftone", "grain", "paper", "risograph", "dither", "pixel", "ascii", "mosaic", "engrav", "blueprint", "cyanotype"]
        result["plain_language_terms_on_screen"] = sorted({w for w in plain_words if w in dock_text.lower()})

        # Steps to activation: applying a treatment to the visitor's own image.
        steps = []
        t0 = time.perf_counter()

        page.set_input_files("input[type=file]", str(fixture))
        steps.append("choose own image")
        page.wait_for_function(
            "() => !document.querySelector('.source-rail')?.textContent?.includes('Generated sample')",
            timeout=30000,
        )

        page.click("header button.primary-button")
        steps.append("open export dialog")
        page.wait_for_selector(".modal", timeout=15000)

        with page.expect_download(timeout=60000) as dl:
            page.click(".modal button.primary-button")
        steps.append("confirm export")
        saved = dl.value

        result["seconds_from_own_image_to_export"] = round(time.perf_counter() - t0, 2)
        result["seconds_total_to_activation"] = round(time.perf_counter() - started, 2)
        result["steps_to_activation"] = steps
        result["step_count"] = len(steps)
        result["exported_file"] = saved.suggested_filename

        browser.close()

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="https://grainstudio.harshith.com/")
    parser.add_argument("--label", default="baseline")
    args = parser.parse_args()

    result = audit(args.url, args.label)

    print(f"\nActivation audit :: {result['label']}")
    print(f"  url                                  {result['url']}")
    print(f"  seconds to treatment on sample       {result['seconds_to_sample_treatment']}")
    print(f"  seconds from own image to export     {result['seconds_from_own_image_to_export']}")
    print(f"  seconds total to activation          {result['seconds_total_to_activation']}")
    print(f"  steps to activation                  {result['step_count']} -> {result['steps_to_activation']}")
    print(f"  choices shown before any action      {result['choices_visible_at_first_paint']}")
    print(f"  filter tabs                          {result['filter_tabs']}")
    print(f"  effect named in inspector            {result['effect_named_in_inspector']!r}")
    print(f"  plain-language terms on screen       {result['plain_language_terms_on_screen'] or 'NONE'}")
    print(f"  exported file                        {result['exported_file']}")

    verdict = []
    if result["seconds_total_to_activation"] > 600:
        verdict.append("TTFV over 10 minutes: activation problem per the skill")
    if not result["plain_language_terms_on_screen"]:
        verdict.append("no ordinary-language term on screen: a newcomer must guess what each effect does")
    if result["choices_visible_at_first_paint"] > 10:
        verdict.append(f"{result['choices_visible_at_first_paint']} choices before any action: weak progressive disclosure")
    print("\n  findings:")
    for item in verdict or ["none"]:
        print(f"    - {item}")

    out = Path(f"/tmp/activation-audit-{result['label']}.json")
    out.write_text(json.dumps(result, indent=2))
    print(f"\n  saved {out}")


if __name__ == "__main__":
    main()
