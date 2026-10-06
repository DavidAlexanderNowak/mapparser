#!/usr/bin/env python3
"""
make_dump.py -- turn osmium's GeoJSON sequence into a gzipped MariaDB dump.

No database is involved; this writes SQL text. The result is dropped into the
db container's /docker-entrypoint-initdb.d, so a fresh container comes up
already populated.

The dump names no database: it assumes one is already selected. db/load.sh
creates the schema and passes it on the command line.
"""

from __future__ import annotations

import argparse
import gzip
import json
import os
import re
import sys
import time
import unicodedata
from datetime import datetime, timezone

from icu import Transliterator

SCHEMA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schema.sql")

COLUMNS = ("osm_id", "name", "place", "lat", "lon", "population")
SUPPORTED_NAME_SCRIPTS = ("LATIN", "CYRILLIC", "GREEK", "HEBREW")
NAME_TRANSLITERATOR = Transliterator.createInstance("Any-Latin; Latin-ASCII")


# ---------------------------------------------------------------------------
# input
# ---------------------------------------------------------------------------
def iter_features(fh):
    """Yield one GeoJSON feature per line.

    Tolerates the RFC 8142 record separator (0x1e) that osmium prefixes to
    geojsonseq records, and blank lines.
    """
    for line in fh:
        line = line.strip("\x1e \t\r\n")
        if not line:
            continue
        try:
            yield json.loads(line)
        except json.JSONDecodeError:
            continue


# ---------------------------------------------------------------------------
# tag parsing
# ---------------------------------------------------------------------------
_POP_RE = re.compile(r"\d[\d\s.,'\u00a0\u202f]*")
_SEP_RE = re.compile(r"[\s'\u00a0\u202f]")


def parse_population(raw):
    """Turn the free-text OSM population tag into an int, or None.

    Handles '12345', '12,345', '12.345', '12 345', 'ca. 5000', '5000 (2019)'.
    Anything it cannot make sense of becomes NULL rather than a wrong number.
    """
    if not raw:
        return None
    m = _POP_RE.search(raw)
    if not m:
        return None
    s = _SEP_RE.sub("", m.group(0))

    # Both separators present -> the last one is the decimal point: '1.234,5'
    if "," in s and "." in s:
        s = s[: max(s.rfind(","), s.rfind("."))]
    elif "," in s or "." in s:
        head, _, tail = s.rpartition("," if "," in s else ".")
        # A trailing group that is not 3 digits long is a decimal fraction.
        if len(tail) != 3 and s.count(",") + s.count(".") == 1:
            s = head

    s = s.replace(",", "").replace(".", "")
    if not s.isdigit():
        return None
    value = int(s)
    # Sanity bound: also keeps the value inside INT UNSIGNED, which strict
    # mode would otherwise reject.
    return value if 0 < value < 2_000_000_000 else None


def parse_osm_id(feature):
    """osmium --add-unique-id=type_id writes ids like 'n240109189'."""
    raw = feature.get("id")
    if isinstance(raw, int):
        return raw
    if raw is not None:
        m = re.search(r"\d+", str(raw))
        if m:
            return int(m.group(0))
    return None


def contains_unsupported_script(name):
    """Return whether the name contains letters outside the supported scripts."""
    for character in name:
        if not unicodedata.category(character).startswith("L"):
            continue
        character_name = unicodedata.name(character, "")
        if not character_name.startswith(SUPPORTED_NAME_SCRIPTS):
            return True
    return False


def transcribe_name(name):
    """Preserve supported scripts and transliterate all other scripts to Latin."""
    if not contains_unsupported_script(name):
        return name

    transcribed_name = str(NAME_TRANSLITERATOR.transliterate(name)).strip()
    return transcribed_name or None


def to_row(feature, statistics):
    """Map a GeoJSON feature to a row, or None to skip it.

    No place filtering happens here: osmium tags-filter already removed
    everything the application does not want, so the keep-list lives in
    exactly one place, extract.sh.
    """
    props = feature.get("properties") or {}

    place = props.get("place")
    if not place:
        return None

    name = (props.get("name") or "").strip()
    if not name:
        return None  # nameless places are useless for the application
    original_name = name
    name = transcribe_name(name)
    if name is None:
        statistics["skipped_names"] += 1
        print(
            f"    skipped unusable name: osm_id={parse_osm_id(feature)}, "
            f"name={original_name!r}",
            file=sys.stderr,
        )
        return None
    if name != original_name:
        statistics["transliterated_names"] += 1

    geom = feature.get("geometry") or {}
    if geom.get("type") != "Point":
        return None
    try:
        lon, lat = float(geom["coordinates"][0]), float(geom["coordinates"][1])
    except (KeyError, IndexError, TypeError, ValueError):
        return None
    if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
        return None

    osm_id = parse_osm_id(feature)
    if osm_id is None:
        raise SystemExit(
            "Feature without an id. Re-run `osmium export` with "
            "--add-unique-id=type_id so rows get a stable primary key."
        )

    return (
        osm_id,
        name[:255],
        str(place),
        lat,
        lon,
        parse_population(props.get("population")),
    )


# ---------------------------------------------------------------------------
# SQL emission
# ---------------------------------------------------------------------------
# The dump sets an explicit sql_mode without NO_BACKSLASH_ESCAPES, so this is
# the correct escaping regardless of server configuration.
_ESCAPES = {
    "\\": "\\\\", "'": "\\'", '"': '\\"',
    "\n": "\\n", "\r": "\\r", "\0": "\\0", "\x1a": "\\Z",
}


def literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return repr(value)
    return "'" + "".join(_ESCAPES.get(c, c) for c in str(value)) + "'"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-i", "--input", required=True)
    ap.add_argument("-o", "--output", required=True)
    ap.add_argument("--source", default="", help="recorded in the dump's header comment")
    args = ap.parse_args()

    started = time.time()
    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

    with open(SCHEMA_FILE, encoding="utf-8") as fh:
        schema = fh.read()

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    tmp = args.output + ".part"

    seen = written = 0
    statistics = {
        "transliterated_names": 0,
        "skipped_names": 0,
    }
    by_place: dict = {}
    cols = ", ".join(f"`{c}`" for c in COLUMNS)
    batch: list = []

    with gzip.open(tmp, "wt", encoding="utf-8", compresslevel=6) as out:
        out.write(
            f"-- Generated by make_dump.py on {generated_at}\n"
            f"-- source: {args.source or 'n/a'}\n\n"
            "SET NAMES utf8mb4;\n"
            "SET SESSION sql_mode='STRICT_ALL_TABLES';\n"
            "SET SESSION unique_checks=0;\n"
            "SET SESSION foreign_key_checks=0;\n"
            "SET SESSION autocommit=0;\n\n"
        )
        out.write(schema)
        out.write("\n")

        def flush():
            if not batch:
                return
            out.write(f"INSERT INTO `osm_place` ({cols}) VALUES\n")
            out.write(",\n".join(batch))
            out.write(";\n")
            batch.clear()

        with open(args.input, encoding="utf-8") as fh:
            for feature in iter_features(fh):
                seen += 1
                row = to_row(feature, statistics)
                if row is None:
                    continue
                written += 1
                by_place[row[2]] = by_place.get(row[2], 0) + 1
                batch.append("(" + ", ".join(literal(v) for v in row) + ")")
                if len(batch) >= 1000:
                    flush()
                if seen % 250_000 == 0:
                    print(f"    {seen:>9,} read, {written:>9,} kept",
                          file=sys.stderr, flush=True)
        flush()

        out.write("\nCOMMIT;\n")

    os.replace(tmp, args.output)

    print(f"\n    read    : {seen:,} features")
    print(f"    written : {written:,} rows")
    print(f"    transliterated names: {statistics['transliterated_names']:,}")
    print(f"    skipped unusable names: {statistics['skipped_names']:,}")
    for place, n in sorted(by_place.items(), key=lambda kv: -kv[1]):
        print(f"      {place:<12} {n:>9,}")
    print(f"    dump    : {args.output} "
          f"({os.path.getsize(args.output) / 1e6:.1f} MB gzipped)")
    print(f"    took    : {time.time() - started:.1f}s")

    if written == 0:
        print("\n    WARNING: no rows produced, check the input.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())