"""Check that every local asset referenced by the site and the app exists."""

import json
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
problems = []


class Refs(HTMLParser):
    VOID = {
        "area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr",
    }

    def __init__(self):
        super().__init__()
        self.refs = []
        self.stack = []
        self.unbalanced = []

    def handle_starttag(self, tag, attrs):
        bag = dict(attrs)
        for key in ("src", "href"):
            value = bag.get(key)
            if value:
                self.refs.append(value)
        if tag not in self.VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in self.VOID:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        else:
            self.unbalanced.append(tag)
            if tag in self.stack:
                while self.stack and self.stack.pop() != tag:
                    pass


def check_html(path):
    parser = Refs()
    parser.feed(open(path, encoding="utf-8").read())
    if parser.stack or parser.unbalanced:
        problems.append(
            f"{os.path.relpath(path, ROOT)} -> unbalanced tags: open={parser.stack} unexpected_close={parser.unbalanced}"
        )
    base = os.path.dirname(path)
    for ref in parser.refs:
        if ref.startswith(("http://", "https://", "mailto:", "#", "data:")):
            continue
        cleaned = ref.split("?")[0].split("#")[0]
        if not cleaned:
            continue
        target = os.path.normpath(os.path.join(base, cleaned))
        if cleaned.endswith("/"):
            target = os.path.join(target, "index.html")
        if not os.path.exists(target):
            problems.append(f"{os.path.relpath(path, ROOT)} -> missing {ref}")


check_html(os.path.join(ROOT, "index.html"))
check_html(os.path.join(ROOT, "app", "index.html"))

manifest_path = os.path.join(ROOT, "app", "manifest.webmanifest")
manifest = json.load(open(manifest_path, encoding="utf-8"))
for icon in manifest.get("icons", []):
    target = os.path.normpath(os.path.join(ROOT, "app", icon["src"]))
    if not os.path.exists(target):
        problems.append(f"manifest -> missing {icon['src']}")

sw = open(os.path.join(ROOT, "app", "sw.js"), encoding="utf-8").read()
for match in re.finditer(r"'\./([^']+)'", sw):
    asset = match.group(1)
    if not asset:
        continue
    target = os.path.normpath(os.path.join(ROOT, "app", asset))
    if not os.path.exists(target):
        problems.append(f"sw.js -> missing {asset}")

if problems:
    print("PROBLEMS:")
    for problem in problems:
        print("  -", problem)
    sys.exit(1)

print("All local references resolve.")
print("Manifest icons:", len(manifest.get("icons", [])))
print("Service worker assets:", len(re.findall(r"'\./[^']+'", sw)))
