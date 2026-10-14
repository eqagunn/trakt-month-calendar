#!/usr/bin/env python3
"""Build browser packages from one source tree using Python's standard library."""

import json
import copy
from pathlib import Path
import re
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist"
MANIFEST = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
VERSION = MANIFEST.get("version_name", MANIFEST["version"])
BASE = "trakt-month-calendar-v" + VERSION


def png_size(path):
    header = path.read_bytes()[:24]
    if header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        raise ValueError(f"Not a PNG: {path}")
    return struct.unpack(">II", header[16:24])


def read_entry(source):
    return source if isinstance(source, bytes) else source.read_bytes()


def browser_manifest(browser):
    manifest = copy.deepcopy(MANIFEST)
    settings = manifest.pop("browser_specific_settings", {})
    if browser == "firefox":
        manifest.pop("minimum_chrome_version", None)
        manifest["browser_specific_settings"] = {"gecko": settings["gecko"]}
    elif browser == "safari":
        manifest.pop("minimum_chrome_version", None)
        manifest["browser_specific_settings"] = {"safari": settings["safari"]}
    elif browser != "chromium":
        raise ValueError(f"Unsupported browser target: {browser}")
    return manifest


def write_zip(path, entries):
    entries = sorted(entries, key=lambda entry: entry[1])
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for source, name in entries:
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 11, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, read_entry(source))
    with zipfile.ZipFile(path) as archive:
        if archive.testzip() is not None:
            raise ValueError(f"Invalid ZIP: {path}")
        if archive.namelist() != [name for _, name in entries]:
            raise ValueError(f"Unexpected ZIP layout: {path}")
        for source, name in entries:
            if archive.read(name) != read_entry(source):
                raise ValueError(f"Source mismatch: {name}")
    print(path)


def main():
    if MANIFEST["manifest_version"] != 3:
        raise ValueError("Expected Manifest V3")
    if not re.fullmatch(r"(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*)){0,3}", MANIFEST["version"]):
        raise ValueError("Chrome requires a numeric update version")
    if any(int(part) > 65535 for part in MANIFEST["version"].split(".")) or not any(int(part) for part in MANIFEST["version"].split(".")):
        raise ValueError("Chrome version components are out of range")
    if len(MANIFEST["description"]) > 132:
        raise ValueError("Manifest description is too long")
    if json.loads((ROOT / "package.json").read_text())["version"] != VERSION:
        raise ValueError("Package and display versions differ")
    if f"const VERSION='{VERSION}';" not in (ROOT / "content.js").read_text():
        raise ValueError("Calendar footer and display versions differ")

    runtime = {"manifest.json", "LICENSE", "NOTICE.md", *MANIFEST["icons"].values()}
    for content_script in MANIFEST["content_scripts"]:
        runtime.update(content_script.get("js", []))
        runtime.update(content_script.get("css", []))
    for name in runtime:
        if not (ROOT / name).is_file() or Path(name).is_absolute() or ".." in Path(name).parts:
            raise ValueError(f"Invalid runtime reference: {name}")
    if png_size(ROOT / MANIFEST["icons"]["128"]) != (128, 128):
        raise ValueError("Extension icon must be 128x128")
    if png_size(ROOT / "store-assets/screenshot.png") not in {(1280, 800), (640, 400)}:
        raise ValueError("Unexpected screenshot dimensions")
    if png_size(ROOT / "store-assets/promo.png") != (440, 280):
        raise ValueError("Small promo image must be 440x280")

    OUT.mkdir(exist_ok=True)
    shared = [(ROOT / name, name) for name in runtime if name != "manifest.json"]
    for browser, suffix in (("chromium", "-chrome"), ("firefox", "-firefox"), ("safari", "-safari")):
        manifest = browser_manifest(browser)
        manifest_bytes = (json.dumps(manifest, indent=2) + "\n").encode("utf-8")
        write_zip(OUT / (BASE + suffix + ".zip"), [(manifest_bytes, "manifest.json"), *shared])
    source = [(path, "trakt-month-calendar/" + path.relative_to(ROOT).as_posix()) for path in ROOT.rglob("*") if path.is_file() and not any(part in {"dist", "node_modules", ".git", "__pycache__"} for part in path.relative_to(ROOT).parts) and path.suffix != ".pyc"]
    write_zip(OUT / (BASE + "-source.zip"), source)
    listing = [(ROOT / "icons/icon-128.png", "icon.png"), (ROOT / "store-assets/screenshot.png", "screenshot.png"), (ROOT / "store-assets/promo.png", "promo.png"), (ROOT / "PRIVACY.md", "PRIVACY.md"), (ROOT / "docs/STORE-LISTING.md", "STORE-LISTING.md"), (ROOT / "docs/PUBLISHING.md", "PUBLISHING.md")]
    write_zip(OUT / (BASE + "-store-assets.zip"), listing)


if __name__ == "__main__":
    main()
