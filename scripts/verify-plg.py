"""Browser verification for the Grain Studio PLG changes.

Serves the production build locally, drives it with Chromium, and asserts:
  1. A recipe link restores the exact effect and palette it encodes.
  2. A normal visit is unaffected.
  3. Copy-look-link produces a shareable URL and a reassuring toast.
  4. Analytics fire the expected events with no image-identifying properties.

Analytics requests are intercepted and fulfilled locally, so verification never
writes into the production PostHog project.
"""

import functools
import http.server
import json
import socketserver
import threading

from playwright.sync_api import sync_playwright

PORT = 8899
ROOT = "dist"
FORBIDDEN = {
    "file_name", "filename", "name", "image_name", "bytes", "file_size",
    "width", "height", "dimensions", "mime_type", "data_url", "canvas",
    "src", "url", "href", "path", "query", "search", "email",
}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    handler = functools.partial(Quiet, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    httpd = serve()
    base = f"http://127.0.0.1:{PORT}"
    failures = []
    captured = []
    console_errors = []

    def check(label, condition, detail=""):
        status = "PASS" if condition else "FAIL"
        print(f"  [{status}] {label}" + (f" :: {detail}" if detail and not condition else ""))
        if not condition:
            failures.append(label)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(permissions=["clipboard-read", "clipboard-write"], accept_downloads=True)
        # Force analytics on for a local build and label it as verification.
        context.add_init_script("localStorage.setItem('grain-studio-analytics-debug','1')")

        def intercept(route):
            try:
                captured.append(json.loads(route.request.post_data or "{}"))
            except Exception:
                captured.append({"unparsed": True})
            route.fulfill(status=200, content_type="application/json", body='{"status":"Ok"}')

        context.route("**/i/v0/e/**", intercept)
        page = context.new_page()
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

        print("\n1. Recipe link restores the encoded look")
        # Every value below differs from Blueprint's own defaults
        # (intensity 100, detail 70, contrast 62, scale 10, palette cobalt),
        # so passing proves the state came from the link and not from defaults.
        page.goto(f"{base}/?r=1.blueprint.42.88.55.20.ember.4321", wait_until="load")
        page.wait_for_selector(".inspector h1", timeout=15000)
        heading = page.inner_text(".inspector h1")
        check("effect from recipe is selected", heading.strip() == "Blueprint", f"got {heading!r}")
        ember = page.get_attribute("button[aria-label='Use Ember palette']", "aria-pressed")
        check("non-default palette from recipe is applied", ember == "true", f"aria-pressed={ember!r}")
        values = {control: page.input_value(f"#{control}") for control in ("intensity", "detail", "contrast", "scale")}
        expected = {"intensity": "42", "detail": "88", "contrast": "55", "scale": "20"}
        check("all non-default settings from recipe are applied", values == expected, f"{values} != {expected}")

        print("\n2. Progressive disclosure and non-starter recipes")
        # A new visitor should meet the curated set, not the whole catalog.
        page.goto(base, wait_until="load")
        page.wait_for_selector(".texture-dock button", timeout=15000)
        tabs = page.eval_on_selector_all(".category-tabs button", "els => els.map(e => e.textContent.trim())")
        active = page.eval_on_selector_all(
            ".category-tabs button[aria-selected='true']", "els => els.map(e => e.textContent.trim())"
        )
        check("Start here is the opening group", active == ["Start here"], str(active))
        check("full catalog stays one click away", "All" in tabs, str(tabs))
        starters = page.locator(".texture-dock button").count()
        check("opens on a handful of choices, not 25", starters == 6, f"{starters} shown")
        # The eyebrow is uppercased by CSS, so compare case-insensitively.
        eyebrow = page.inner_text(".inspector .eyebrow").strip().lower()
        check("plain-language name is always visible", eyebrow == "risograph print", eyebrow)

        # Isoform is deliberately NOT a starter, so an arriving recipe for it must
        # switch to the full catalog or the shared look would be invisible.
        page.goto(f"{base}/?r=1.isoform.64.92.58.18.ember.17", wait_until="load")
        page.wait_for_selector(".inspector h1", timeout=15000)
        check("non-starter recipe still selects its effect", page.inner_text(".inspector h1").strip() == "Isoform", page.inner_text(".inspector h1"))
        active2 = page.eval_on_selector_all(
            ".category-tabs button[aria-selected='true']", "els => els.map(e => e.textContent.trim())"
        )
        check("non-starter recipe opens the full catalog", active2 == ["All"], str(active2))
        visible_ids = page.eval_on_selector_all(".texture-dock button", "els => els.map(e => e.dataset.textureId)")
        check("the shared effect is visible in the dock", "isoform" in visible_ids, str(len(visible_ids)))

        print("\n3. A visit without a recipe is unchanged")
        page.goto(base, wait_until="load")
        page.wait_for_selector(".inspector h1", timeout=15000)
        default_heading = page.inner_text(".inspector h1")
        check("default effect still loads", default_heading.strip() == "Riso Print", f"got {default_heading!r}")

        print("\n4. Copy look link")
        page.click("button.share-action")
        page.wait_for_timeout(600)
        clipboard = page.evaluate("navigator.clipboard.readText()")
        check("clipboard holds a recipe link", "?r=1.riso-print." in clipboard, clipboard)
        check("link has no image or campaign data", "utm" not in clipboard and "blob:" not in clipboard, clipboard)
        toast = page.inner_text(".toast") if page.locator(".toast").count() else ""
        check("user is told the image is not shared", "never your image" in toast.lower(), toast)

        print("\n5. Export is the activation event")
        page.click("header button.primary-button")
        page.wait_for_selector(".modal", timeout=10000)
        with page.expect_download(timeout=30000) as download:
            page.click(".modal button.primary-button")
        saved = download.value
        check("a file is actually produced", saved.suggested_filename.endswith(".png"), saved.suggested_filename)
        page.wait_for_timeout(900)
        export_events = [c for c in captured if c.get("event") == "export_completed"]
        check("export_completed fired", len(export_events) == 1, str([c.get("event") for c in captured]))
        if export_events:
            props = export_events[0].get("properties", {})
            check(
                "sample use is distinguished from a real image",
                props.get("source_kind") == "sample",
                str(props.get("source_kind")),
            )
            check("first export is flagged for activation measurement", props.get("is_first_export") is True, str(props))
            check("the exported look is recorded as a recipe", str(props.get("recipe", "")).startswith("1.riso-print."), str(props.get("recipe")))
            check("export format and size preset are recorded", props.get("export_format") == "png" and props.get("export_size") == "original", str(props))

        print("\n6. Analytics payloads")
        page.wait_for_timeout(800)
        events = [c.get("event") for c in captured]
        check("app_opened fired", "app_opened" in events, str(events))
        check("recipe_link_opened fired on recipe arrival", "recipe_link_opened" in events, str(events))
        check("recipe_copied fired on share", "recipe_copied" in events, str(events))

        leaked = set()
        bad_env = []
        for payload in captured:
            props = payload.get("properties", {}) or {}
            leaked |= FORBIDDEN & set(props.keys())
            if props.get("environment") != "verification":
                bad_env.append(props.get("environment"))
        check("no image-identifying property was sent", not leaked, str(leaked))
        check("events are labelled as verification, not production", not bad_env, str(bad_env))
        check("every payload carries the site tag", all((c.get("properties") or {}).get("site") == "grainstudio" for c in captured))

        print("\n7. Console health")
        real_errors = [e for e in console_errors if "favicon" not in e.lower()]
        check("no console errors", not real_errors, str(real_errors[:3]))

        browser.close()

    httpd.shutdown()

    print("\n" + "=" * 62)
    print(f"events captured: {[c.get('event') for c in captured]}")
    if failures:
        print(f"RESULT: {len(failures)} FAILED -> {failures}")
        raise SystemExit(1)
    print("RESULT: all checks passed")


if __name__ == "__main__":
    main()
