#!/usr/bin/env python3
"""
Aqua Ludo site asset compressor.

Scans every image and video under public/ (the served site), compresses them
locally with visually-lossless settings, replaces the originals in place (same
names/extensions, so no HTML/CSS/JS changes are needed), then audits every
public page to guarantee no page exceeds MAX_PAGE_KB of assets.

Pipeline:
  - Images  : Pillow re-encode (JPEG q85 progressive / WebP q80 method 6 /
              PNG quantize+optimize, keeping the original extension).
  - Videos  : ffmpeg H.264, audio dropped, faststart, fitted to a size budget
              by walking down (resolution, CRF) profiles until it fits.
  - Audit   : every HTML page (admin excluded) -> sum of HTML + CSS + JS +
              referenced images + the dynamic assets injected by app.js/db.js
              (boat.png on all pages; the 5 activity photos on the
              activities/activity pages). Anything over MAX_PAGE_KB is flagged.
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

MAX_PAGE_KB = 2048
PUBLIC = Path(__file__).resolve().parent.parent / "public"
STAGE = Path(__file__).resolve().parent.parent / "build" / "compressed"
STAGE.mkdir(parents=True, exist_ok=True)

JPEG_Q = 85
WEBP_Q = 80
PNG_COLORS = 256

# Dynamic media referenced from JS (not visible in HTML markup).
BOAT_PNG = "assets/img/boat.png"
FAVICON_PNG = "assets/img/brand/favicon.png"
ACTIVITY_PHOTOS = [
    "assets/img/activities/rowing.webp",
    "assets/img/activities/kayaking.webp",
    "assets/img/activities/sup.webp",
    "assets/img/activities/wakeboard.webp",
    "assets/img/activities/fitness.webp",
]
VIDEO_BUDGET_BYTES = int(1_200_000)
VIDEO_PROFILES = [
    ("scale=1280:720", "220k"),
    ("scale=960:540", "200k"),
    ("scale=854:480", "200k"),
    ("scale=640:360", "160k"),
]


def compress_image(src: Path, dst: Path) -> int:
    from PIL import Image

    suffix = src.suffix.lower()
    im = Image.open(src)
    im.load()
    if im.mode == "P":
        im = im.convert("RGBA") if "transparency" in im.info else im.convert("RGB")
    if suffix in (".jpg", ".jpeg"):
        out = im.convert("RGB")
        out.save(dst, "JPEG", quality=JPEG_Q, progressive=True, optimize=True)
    elif suffix == ".webp":
        out = im.convert("RGB") if im.mode == "RGBA" and not _has_alpha(im) else im
        out.save(dst, "WEBP", quality=WEBP_Q, method=6)
    elif suffix == ".png":
        best = im
        best_bytes = None
        candidates = []
        if im.mode == "RGBA" and _has_alpha(im):
            candidates.append(("rgba_opt", im.convert("RGBA")))
            try:
                candidates.append(("palette", im.quantize(colors=PNG_COLORS, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)))
            except Exception:
                pass
        else:
            candidates.append(("rgb_opt", im.convert("RGB")))
            candidates.append(("palette", im.convert("RGB").quantize(colors=PNG_COLORS, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG)))
        for _label, cand in candidates:
            buf = _try_save(cand, "PNG", optimize=True)
            if buf is None:
                continue
            if best_bytes is None or len(buf) < best_bytes:
                best, best_bytes = cand, len(buf)
        if best_bytes is None:
            return 0
        best.save(dst, "PNG", optimize=True)
    else:
        return 0
    return dst.stat().st_size


def _try_save(im, fmt, **kw):
    import io

    buf = io.BytesIO()
    try:
        im.save(buf, fmt, **kw)
        return buf.getvalue()
    except Exception:
        return None


def _has_alpha(im) -> bool:
    if "A" not in im.getbands():
        return False
    try:
        alpha = im.getchannel("A")
        return alpha.getextrema() != (255, 255)
    except Exception:
        return True


def compress_video(src: Path, dst: Path, budget: int) -> int:
    duration = float(
        subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(src)],
            capture_output=True, text=True, check=True,
        ).stdout.strip().splitlines()[0]
    )
    for i, (vf, bitrate) in enumerate(VIDEO_PROFILES):
        attempt = STAGE / f"hero_attempt_{i}.mp4"
        logfile = STAGE / f"hero_attempt_{i}_2pass"
        base = [
            "ffmpeg", "-y", "-i", str(src),
            "-vf", vf, "-r", "20", "-an",
            "-c:v", "libx264", "-preset", "slow",
            "-profile:v", "high", "-pix_fmt", "yuv420p",
            "-b:v", bitrate, "-maxrate", "240k", "-bufsize", "480k",
            "-passlogfile", str(logfile),
        ]
        subprocess.run(base + ["-pass", "1", "-f", "null", os.devnull],
                       check=True, capture_output=True)
        subprocess.run(base + ["-pass", "2", "-movflags", "+faststart", str(attempt)],
                       check=True, capture_output=True)
        logfile.unlink(missing_ok=True)
        logfile.with_suffix(".log.mbtree").unlink(missing_ok=True)
        size = attempt.stat().st_size
        print(f"    attempt {i + 1}: {vf} {bitrate} -> {size / 1024:.0f} KB "
              f"({size / duration / 125:.0f} kbps avg)")
        if size <= budget:
            shutil.move(str(attempt), str(dst))
            return size
        attempt.unlink(missing_ok=True)
    print(f"    WARNING: video could not fit budget ({budget / 1024:.0f} KB)")
    return 0


def process_media() -> None:
    from PIL import Image  # noqa: F401 (import check)

    targets = [p for p in PUBLIC.rglob("*") if p.suffix.lower() in
               {".jpg", ".jpeg", ".png", ".webp", ".mp4", ".webm", ".mov"}]
    total_before = total_after = 0
    for src in sorted(targets):
        rel = src.relative_to(PUBLIC)
        dst = STAGE / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        before = src.stat().st_size
        total_before += before
        if src.suffix.lower() == ".mp4":
            size = compress_video(src, dst, VIDEO_BUDGET_BYTES)
        else:
            size = compress_image(src, dst)
        if size and size < before:
            shutil.copy2(dst, src)
            print(f"{rel} : {before / 1024:7.1f} KB -> {size / 1024:7.1f} KB "
                  f"({size / before * 100:.0f}%)")
            total_after += size
        else:
            print(f"{rel} : kept original ({before / 1024:.1f} KB)")
            total_after += before
    print(f"\nTotal media: {total_before / 1024:.0f} KB -> {total_after / 1024:.0f} KB "
          f"({total_after / total_before * 100:.0f}%)")


def audit_pages() -> None:
    site = PUBLIC / "site"
    regex = re.compile(r'(?:src|href)="([^"]+\.(?:png|jpe?g|webp|gif|svg|mp4|webm|mov))"', re.I)
    js_re = re.compile(r'<script[^>]+src="([^"]+\.js)"', re.I)
    css_re = re.compile(r'<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"', re.I)

    def resolve(page: Path, ref: str) -> Path | None:
        base = page.parent
        if ref.startswith("/"):
            p = PUBLIC / ref.lstrip("/")
        elif ref.startswith("site/"):
            p = PUBLIC / ref
        else:
            p = (base / ref).resolve()
        return p if p.is_file() else None

    def page_assets(page: Path) -> list[Path]:
        html = page.read_text(encoding="utf-8", errors="ignore")
        paths = [p for m in regex.finditer(html) if (p := resolve(page, m.group(1)))]
        paths += [p for m in js_re.finditer(html) if (p := resolve(page, m.group(1)))]
        paths += [p for m in css_re.finditer(html) if (p := resolve(page, m.group(1)))]
        if page.name in ("activities.html", "activity.html"):
            paths += [site / a for a in ACTIVITY_PHOTOS]
        paths += [site / BOAT_PNG, site / FAVICON_PNG]
        return [p for p in paths if p]

    pages = sorted(PUBLIC.rglob("*.html"))
    fail = 0
    print("\n=== Per-page weight audit (limit 2048 KB) ===")
    for page in pages:
        if "admin" in page.parts:
            continue
        assets = list(dict.fromkeys(page_assets(page)))
        total = sum(p.stat().st_size for p in assets)
        kb = total / 1024
        worst = max(assets, key=lambda p: p.stat().st_size) if assets else None
        mark = "OK " if kb <= MAX_PAGE_KB else "FAIL"
        if kb > MAX_PAGE_KB:
            fail += 1
        print(f"  [{mark}] {kb:7.1f} KB  {page.relative_to(PUBLIC)}"
              + (f"   (largest: {worst.relative_to(PUBLIC)} {worst.stat().st_size / 1024:.0f} KB)" if worst else ""))
    print(f"\nPages over limit: {fail}" if fail else "\nAll pages within the 2048 KB budget.")


if __name__ == "__main__":
    if "--audit-only" in sys.argv:
        audit_pages()
    else:
        process_media()
        audit_pages()
