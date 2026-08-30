"""Verification for the static look pages.

Serves the production build and checks that each generated page is a real,
indexable document, that its call to action opens the exact effect it documents,
and that the sitemap and JSON-LD are valid.
"""

import argparse
import functools
import http.server
import json
import socketserver
import threading
import xml.etree.ElementTree as ET
from pathlib import Path

from playwright.sync_api import sync_playwright

PORT = 8911
ROOT = "dist"
ORIGIN = "https://grainstudio.harshith.com"
EXPECTED = {
    "paper-texture": ("Paper Fiber", "paper texture"),
    "risograph-print": ("Riso Print", "risograph"),
    "halftone-effect": ("Cross Dot", "halftone"),
    "cyanotype-blueprint": ("Blueprint", "cyanotype"),
    "pixelate-image": ("Pixel Crush", "pixelate"),
    "ascii-art": ("Glyph Weave", "ascii"),
}

failures = []


def check(label, ok, detail=""):
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}" + (f" :: {detail}" if detail and not ok else ""))
    if not ok:
        failures.append(label)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", help="Verify a deployed origin instead of the local build.")
    args = parser.parse_args()

    httpd = None
    if args.url:
        base = args.url.rstrip("/")
        sitemap_xml = __import__("urllib.request", fromlist=["request"]).urlopen(f"{base}/sitemap.xml", timeout=30).read()
        robots = __import__("urllib.request", fromlist=["request"]).urlopen(f"{base}/robots.txt", timeout=30).read().decode()
    else:
        socketserver.TCPServer.allow_reuse_address = True
        httpd = socketserver.TCPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=ROOT))
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{PORT}"
        sitemap_xml = (Path(ROOT) / "sitemap.xml").read_bytes()
        robots = (Path(ROOT) / "robots.txt").read_text()
    console_errors = []

    print(f"\n1. Sitemap and robots ({base})")
    tree = ET.ElementTree(ET.fromstring(sitemap_xml))
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [el.text for el in tree.getroot().findall("s:url/s:loc", ns)]
    check("sitemap parses with the correct namespace", len(locs) == 8, str(len(locs)))
    check("sitemap lists the editor and the hub", f"{ORIGIN}/" in locs and f"{ORIGIN}/looks/" in locs, str(locs[:2]))
    for slug in EXPECTED:
        check(f"sitemap lists {slug}", f"{ORIGIN}/looks/{slug}/" in locs)
    check("robots points at the sitemap", f"Sitemap: {ORIGIN}/sitemap.xml" in robots, robots)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

        print("\n2. Hub page")
        page.goto(f"{base}/looks/", wait_until="load", timeout=30000)
        cards = page.eval_on_selector_all(".grid a", "els => els.map(e => e.getAttribute('href'))")
        check("hub links to every look", len(cards) == len(EXPECTED), str(cards))
        canonical = page.get_attribute("link[rel=canonical]", "href")
        check("hub canonical is absolute and correct", canonical == f"{ORIGIN}/looks/", str(canonical))
        check("hub renders without application JavaScript", page.locator("script[src]").count() == 0)

        print("\n3. Each look page is a real document")
        for slug, (effect_label, term) in EXPECTED.items():
            page.goto(f"{base}/looks/{slug}/", wait_until="load", timeout=30000)
            title = page.title().lower()
            check(f"{slug}: title carries the search term", term in title, page.title())
            canon = page.get_attribute("link[rel=canonical]", "href")
            check(f"{slug}: canonical is correct", canon == f"{ORIGIN}/looks/{slug}/", str(canon))
            desc = page.get_attribute("meta[name=description]", "content") or ""
            check(f"{slug}: has a useful description", 60 < len(desc) <= 200, f"len={len(desc)}")
            og = page.get_attribute("meta[property='og:url']", "content")
            check(f"{slug}: open-graph url matches canonical", og == canon, str(og))
            try:
                ld = json.loads(page.inner_text("script[type='application/ld+json']"))
                ok_ld = ld.get("@type") == "TechArticle" and ld.get("url") == f"{ORIGIN}/looks/{slug}/"
            except Exception as exc:  # noqa: BLE001
                ok_ld = False
                ld = str(exc)
            check(f"{slug}: JSON-LD is valid and self-consistent", ok_ld, str(ld)[:120])
            headings = page.eval_on_selector_all("h2", "els => els.map(e => e.textContent.trim())")
            check(f"{slug}: explains how it works and what controls do",
                  "How it works" in headings and "What each control changes" in headings, str(headings))
            words = len(page.inner_text("body").split())
            check(f"{slug}: is substantive, not a doorway page", words > 260, f"{words} words")
            check(f"{slug}: states what it is less suited to", page.locator(".caveat").count() == 1)

        print("\n4. The call to action opens the documented effect")
        for slug, (effect_label, _term) in EXPECTED.items():
            page.goto(f"{base}/looks/{slug}/", wait_until="load", timeout=30000)
            page.click(".cta a.primary")
            page.wait_for_selector(".inspector h1", timeout=30000)
            shown = page.inner_text(".inspector h1").strip()
            check(f"{slug}: opens {effect_label} in the editor", shown == effect_label, f"got {shown!r}")

        print("\n5. The editor links to the look pages")
        page.goto(f"{base}/", wait_until="load", timeout=30000)
        page.wait_for_selector(".texture-dock button", timeout=25000)
        looks_link = page.get_attribute("a.header-looks", "href")
        check("editor header links to the hub", looks_link == "/looks/", str(looks_link))
        page.click("a.header-looks")
        page.wait_for_selector(".grid a", timeout=25000)
        check("that link reaches the hub", "/looks/" in page.url, page.url)

        print("\n6. Console health")
        real = [e for e in console_errors if "favicon" not in e.lower()]
        check("no console errors across every page", not real, str(real[:3]))

        browser.close()

    if httpd:
        httpd.shutdown()
    print("\n" + "=" * 62)
    if failures:
        print(f"RESULT: {len(failures)} FAILED -> {failures}")
        raise SystemExit(1)
    print("RESULT: all look-page checks passed")


if __name__ == "__main__":
    main()
