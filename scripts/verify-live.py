"""Live production verification for the Grain Studio PLG release.

Checks the deployed app on grainstudio.harshith.com and the acquisition path from
harshith.com. Analytics requests are observed rather than intercepted, so this
confirms real ingestion into the self-hosted PostHog project.
"""

import json

from playwright.sync_api import sync_playwright

APP = "https://grainstudio.harshith.com"
SITE = "https://www.harshith.com/apps/grain-studio"
RECIPE = "1.blueprint.42.88.55.20.ember.4321"

failures = []


def check(label, ok, detail=""):
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}" + (f" :: {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(label)


def main():
    analytics = []
    console_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(permissions=["clipboard-read", "clipboard-write"])
        page = context.new_page()
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

        def on_response(response):
            if "/i/v0/e/" in response.url:
                body = None
                try:
                    body = json.loads(response.request.post_data or "{}")
                except Exception:
                    pass
                analytics.append((response.status, body))

        page.on("response", on_response)

        print("\n1. Acquisition path from harshith.com")
        page.goto(SITE, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(2500)
        hrefs = page.eval_on_selector_all("a[href]", "els => els.map(e => e.href)")
        app_links = [h for h in hrefs if "grainstudio.harshith.com" in h]
        check("site links to the app domain", bool(app_links), str(hrefs[:6]))
        if app_links:
            probe = context.request.get(app_links[0], timeout=30000)
            check("that link actually resolves", probe.status == 200, f"HTTP {probe.status} for {app_links[0]}")

        print("\n2. Live app loads and honours a shared recipe")
        # Console errors from the marketing site are out of scope for this app.
        console_errors.clear()
        page.goto(f"{APP}/?r={RECIPE}&utm_source=verification", wait_until="load", timeout=45000)
        page.wait_for_selector(".inspector h1", timeout=25000)
        check("app renders", page.inner_text(".inspector h1").strip() == "Blueprint", page.inner_text(".inspector h1"))
        values = {c: page.input_value(f"#{c}") for c in ("intensity", "detail", "contrast", "scale")}
        check("shared settings applied live", values == {"intensity": "42", "detail": "88", "contrast": "55", "scale": "20"}, str(values))
        check("share control is present", page.locator("button.share-action").count() == 1)

        print("\n3. Events reach the self-hosted PostHog project")
        page.wait_for_timeout(2500)
        statuses = {status for status, _ in analytics}
        events = [(b or {}).get("event") for _, b in analytics]
        check("analytics requests were sent", bool(analytics), "none observed")
        check("PostHog accepted them", statuses == {200}, str(statuses))
        check("app_opened captured", "app_opened" in events, str(events))
        check("recipe_link_opened captured", "recipe_link_opened" in events, str(events))
        props = next(((b or {}).get("properties", {}) for _, b in analytics if (b or {}).get("event") == "app_opened"), {})
        check("environment is production", props.get("environment") == "production", str(props.get("environment")))
        check("utm attribution captured", props.get("utm_source") == "verification", str(props.get("utm_source")))
        check("site tagged as grainstudio", props.get("site") == "grainstudio", str(props.get("site")))
        forbidden = {"file_name", "filename", "bytes", "width", "height", "url", "path", "email"}
        leaked = sorted(forbidden & set(props.keys()))
        check("no image-identifying property in production payload", not leaked, str(leaked))

        print("\n4. Service worker registers without breaking the page")
        registered = page.evaluate("navigator.serviceWorker.getRegistrations().then(r => r.length)")
        check("service worker registered", registered >= 1, f"count={registered}")
        real_errors = [e for e in console_errors if "favicon" not in e.lower()]
        check("no console errors", not real_errors, str(real_errors[:3]))

        browser.close()

    print("\n" + "=" * 62)
    print(f"analytics observed: {[(s, (b or {}).get('event')) for s, b in analytics]}")
    if failures:
        print(f"RESULT: {len(failures)} FAILED -> {failures}")
        raise SystemExit(1)
    print("RESULT: live verification passed")


if __name__ == "__main__":
    main()
