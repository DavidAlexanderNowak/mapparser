#!/usr/bin/env bash
#
# planet-YYMMDD.osm.pbf  ->  a MariaDB dump the db container loads on first boot.
#
#     docker compose run --rm extractor
#
# Reads the newest .osm.pbf found in /planet, writes everything to /data.
# No database is contacted.
#
set -euo pipefail

# The place types the application queries. The only thing in this file worth
# changing, and only if the application's granularity levels change too.
PLACES="city,town,village,suburb"

FILTERED=/data/places.osm.pbf
EXPORTED=/data/places.geojsonseq
DUMP=/data/osm_places_slim.sql.gz

log() { printf '\n=== %s  [%s]\n' "$*" "$(date -u +%H:%M:%S)" >&2; }

PBF=$(find /planet -maxdepth 1 -name '*.osm.pbf' -printf '%T@ %p\n' 2>/dev/null \
      | sort -rn | head -1 | cut -d' ' -f2-)

if [[ -z "$PBF" ]]; then
    cat >&2 <<EOF
No .osm.pbf found in /planet.

Edit the first volume line in docker-compose.yml so it points at the folder
holding your downloaded planet file. Currently mounted there:

$(ls -la /planet 2>&1 | sed 's/^/    /')
EOF
    exit 1
fi

echo "    input  : $PBF ($(du -h "$PBF" | cut -f1))"
echo "    places : $PLACES"

# --- 1. filter -------------------------------------------------------------
# The expensive step: one streaming pass over the planet, 30-60 minutes,
# very little memory because only nodes are kept.
log "filtering n/place=$PLACES"
osmium tags-filter --overwrite --progress -o "$FILTERED" "$PBF" "n/place=$PLACES"
echo "    filtered : $(du -h "$FILTERED" | cut -f1)"

# --- 2. export geometry and tags ------------------------------------------
log "exporting"
osmium export --overwrite --progress \
    -f geojsonseq --geometry-types=point --add-unique-id=type_id \
    -o "$EXPORTED" "$FILTERED"
echo "    features : $(wc -l < "$EXPORTED")"

# --- 3. generate the dump --------------------------------------------------
log "generating $DUMP"
python3 /opt/osm/make_dump.py -i "$EXPORTED" -o "$DUMP" --source "$(basename "$PBF")"

cat <<EOF

=== done

    $DUMP

Next: cd ../db && docker compose up -d
EOF
