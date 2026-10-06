# OpenTTD Heightmap Generator

[Diclaimer: the readme is currently AI-generated (and checked by me afterwards), because I did not yet have time to write a good
text myself.]

This is the public repository, in which I deliberately only show the code and basic needed setup, not the full development
git repo, since that one contains data in the project history that is not meant to be public.
I intentionally update this public repo only on each patch of the tool, so the current live version is always open-source.

A web tool that turns any place on Earth into a playable [OpenTTD](https://openttd.org) map.

Pick a spot on a world map, frame it with the selection square, and the tool builds a
1024 x 1024 heightmap from real elevation data, optionally together with a `towns.json`
file that seeds the map with the real settlements found inside the same area.

---

## Contents

1. [About the project](#1-about-the-project)
2. [Features in detail](#2-features-in-detail)
3. [Technology and architecture](#3-technology-and-architecture)

---

# 1. About the project

## What it does

OpenTTD can import a greyscale image as terrain ("Play Heightmap"), and the scenario
editor can import a list of towns from a JSON file. Producing either by hand from real
world data is tedious: you need elevation tiles, you need to stitch, crop, rotate and
normalise them, and you need town positions expressed in the game's own coordinate space.

This tool does all of that from a single button press.

## How a map is made

```
   you frame an area on the map
              |
              v
   +----------------------------+        +---------------------------+
   |  heightmap                 |        |  towns (optional)         |
   +----------------------------+        +---------------------------+
   |  fetch 5 x 5 elevation     |        |  query the OSM place      |
   |  tiles around the centre   |        |  database for the area    |
   |  stitch -> crop to 1024    |        |  rotate to match the map  |
   |  de-noise -> rotate        |        |  drop everything outside  |
   |  cut out -> rescale        |        |  normalise coordinates    |
   |  normalise to sea level    |        |  and populations          |
   +----------------------------+        +---------------------------+
              |                                       |
              +-------------------+-------------------+
                                  v
                    heightmap.png   or   mapdata.zip
```

## What you get

| Town generation | Download | Contents |
| --- | --- | --- |
| Off | `heightmap.png` | 1024 x 1024, 16-bit greyscale PNG |
| Level 1 to 3 | `mapdata.zip` | `heightmap.png` plus `towns.json` |

`towns.json` entries look like this, with `x` and `y` normalised to the range 0 to 1:

```json
[
	{
		"name": "Karlsruhe",
		"population": 1543,
		"city": true,
		"x": 0.48213,
		"y": 0.51004
	}
]
```

## Using the output in OpenTTD

- **Heightmap only** - main menu, "Play Heightmap", pick the PNG.
- **Heightmap and towns** - open the scenario editor, load the heightmap from the save
  icon menu, then go to the towns menu, "Generate towns", "Load from file", and pick
  `towns.json`.

Either way, OpenTTD asks for the height of the highest peak when it loads a heightmap,
and that setting decides how tall the terrain becomes: the brightest pixel in the file is
mapped to it. Because the generator always uses the full brightness range, whatever the
real relief of the area, this is the setting to reach for when a map comes out flatter or
more dramatic than you wanted.

## Running your own instance

The application is a single Quarkus uber-jar plus a MariaDB container holding the town
data. See [Technology and architecture](#3-technology-and-architecture) for the full
setup, including how the town database is built from an OpenStreetMap planet file.

---

# 2. Features in detail

Every feature below lists its caveats. Several of them are deliberate trade-offs rather
than defects, but all of them can surprise you if you do not know about them.

## 2.1 The map and the selection square

A MapLibre GL map with OpenStreetMap raster tiles fills the page. A fixed square frame
sits in the middle of the screen, and whatever lies inside it when you press
**Generate map** becomes your OpenTTD map. You move the world under the frame rather
than moving the frame.

You can pan, zoom, and rotate the map freely. The **true bearing** button eases the
rotation back to due north.

**Caveats**

- The selection is always **square**, because the generated heightmap is always
  1024 x 1024. Non-square maps are a planned feature, not a current one.
- The heightmap is square in *Mercator* pixels, not in kilometres. Far from the equator
  the captured area is noticeably wider east to west than it is tall north to south, and
  the terrain is stretched accordingly. This is inherent to the projection, and it is the
  same stretch you see on the base map.
- The frame scales with the browser window. A larger window therefore captures a larger
  area at the same zoom level, so the zoom readout alone does not tell you how much
  ground you have framed.

## 2.2 Zoom range and data resolution

The header of the frame continuously reports the resolution of the elevation data that
would be used for the current framing, for example `Data resolution 30m x 30m`. It is
the ground sampling distance of the source tiles, not of the output image, which is
always 1024 x 1024 regardless.

Zooming is limited at both ends. Outside the supported range the header shows
**Too zoomed out** or **Too zoomed in** and the generate button is disabled.

| Framed width (approx.) | Reported resolution |
| --- | --- |
| 5000 km down to 1200 km | 1 km |
| 1200 km down to 80 km | 250 m |
| 80 km down to 20 km | 90 m |
| 20 km down to 3 km | 30 m |

**Caveats**

- The limits describe a fixed **ground area**, not a fixed zoom number. Because the
  selection square is sized relative to the browser window, the minimum and maximum zoom
  are recomputed whenever the window is resized or the page is zoomed, so that the framed
  area stays within the same bounds. Expect the map to refuse to zoom out one step
  earlier after you zoom the page out.
- The limits are enforced in the **browser only**. The backend will attempt any request
  it receives.
- Resolution figures are the nominal resolution of the source tile set. The underlying
  data is a mosaic of different surveys, so the real detail available varies by region -
  see [Elevation data](#elevation-data-mapzen-terrarium).
- The finest setting still covers roughly 3 km across. This tool is aimed at regions and
  landscapes, not at individual valleys.

## 2.3 Rotation

The map can be rotated to any bearing, and the heightmap and towns are both rotated to
match, so you can align a coastline or a valley with the edge of your OpenTTD map.

**Caveats**

- A rotated square no longer fits inside the unrotated source image. The tool therefore
  cuts out the largest square that does fit and **scales it back up** to 1024 x 1024. A
  rotated map is consequently built from fewer real samples than an unrotated one, and is
  slightly softer. The loss is worst near 45 degrees.
- Rotation of the elevation grid uses nearest-neighbour sampling, which can leave faint
  stair-stepping on steep, straight slopes.

## 2.4 Sea level modes

The sea level setting decides which elevation counts as zero. Everything at or below it
becomes sea in the generated map, and everything above it is stretched across the full
brightness range of the image, so that as much vertical detail as possible survives into
the file. Land that would round down to zero while being stretched is held at 1 instead,
so low-lying land never silently turns into sea.

The image carries no absolute scale. The brightest pixel is simply the highest point in
the framed area, and how tall that is in game is set when you load the heightmap, not
here - see [Using the output in OpenTTD](#using-the-output-in-openttd).

| Mode | Input | Meaning |
| --- | --- | --- |
| **Absolute** | metres | Elevations at or below this many metres become sea |
| **Relative** | percentile, 0 to 100 | The given percentile of the framed elevations becomes the cutoff |
| **Auto** | none | The tool picks the cutoff itself |

Relative mode is the useful one for inland maps: a lake plateau at 400 m has no sensible
absolute cutoff, but "everything below the 5th percentile is water" works well.

**Caveats**

- **Auto mode is currently a placeholder.** It simply applies absolute mode with a sea
  level of 0 m. It is honest about being a work in progress, but it is not yet doing any
  analysis of the terrain.
- Whatever cutoff you ask for, a **floor** is applied: the cutoff can never go below the
  0.005th percentile of the framed elevations. Without it, a map with no water at all
  would normalise to a single flat value.
- Entering **100** in relative mode is not handled and will fail the request. Stay below
  it; useful values are in the low single digits anyway.
- The stretch is **relative to the framed area**, so the same peak height in OpenTTD
  means a different real-world exaggeration on every map. A flat region and an alpine
  region both fill the brightness range, and the tool does not report the real elevation
  range of what you framed, so picking a realistic peak means knowing that range from
  somewhere else.

## 2.5 Town generation and granularity

With town generation enabled, the download additionally contains a `towns.json` that
OpenTTD's scenario editor can import, placing real settlements at their real positions
with populations scaled into the range the game expects.

The granularity button cycles through four levels.

| Level | Place types included | "City" threshold | Population ceiling |
| --- | --- | --- | --- |
| Off | none, heightmap only | - | - |
| 1 | city | 500,000 | 500,000 |
| 2 | city, town | 100,000 | 100,000 |
| 3 | city, town, village, suburb | 20,000 | 20,000 |

### The granularity level changes more than the place types

This is the least obvious behaviour in the tool, and it is worth reading twice. The level
does **three** things at once:

1. **It selects which OSM place types are included**, as in the table above.
2. **It sets the population normalisation ceiling.** The in-game population is calculated
   as `max(50, min(real population, ceiling) / ceiling * 3000)`, so the ceiling decides
   what counts as "a maximum-sized settlement".
3. **It sets the threshold above which a settlement is marked as a city** in
   `towns.json`. A place must be tagged `place=city` in OpenStreetMap *and* reach the
   threshold for its level.

A worked example. Take a real town of 60,000 people:

- At **level 2**, the ceiling is 100,000, so it becomes `60000 / 100000 * 3000` = **1800**.
- At **level 3**, the ceiling is 20,000, so it is capped there first and becomes **3000**,
  the maximum.

The same place, the same map, a different size in game. Neither is wrong: at level 3 the
map is populated down to suburbs, so a 60,000-person town genuinely is one of the largest
things on it, whereas at level 2 it is mid-sized. But if you regenerate a map at a
different granularity, expect every settlement to be resized.

**Caveats**

- In-game populations are always between **50 and 3000**, whatever the real figures are.
  OpenTTD grows towns during play, so these are starting sizes.
- Settlements **without a population tag** in OpenStreetMap fall back to a default by
  type: 2000 for a city, 500 for a town, 100 for a village or suburb. Because 2000 is
  below every city threshold, an OSM city with no population tag will **never** be marked
  as a city.
- Consequently the city threshold can behave counter-intuitively across levels. A city of
  300,000 is *not* marked as a city at level 1 (threshold 500,000) but *is* at level 2
  (threshold 100,000).
- The finer granularities are **disabled at low zoom**. Framing a whole subcontinent and
  asking for every village would return an enormous list, so level 3 requires a
  reasonably close framing and level 2 a moderate one. The button's tooltip names the
  levels currently forbidden.
- Settlements within **15 tiles of the map edge** are dropped, because OpenTTD cannot
  place a town there.
- Population data in OpenStreetMap is patchy and inconsistent between countries. Some
  regions will look far better populated than others purely because of tagging coverage.
- Town names are taken from the OSM `name` tag, which is the **local** name. Latin,
  Cyrillic, Greek and Hebrew names are kept as they are; everything else is transliterated
  to Latin when the database is built. Configurable per-country name handling is a planned
  feature.
- `suburb` places are included at level 3, so dense cities will produce a cluster of towns
  where you might have expected one.

## 2.6 Interface

- **Two side panels.** The left panel is a short user manual, the right holds project
  information and links. Each can be folded to its header, closed outright, pinned, or
  restored. The info button on the frame brings both back, the reset button closes both
  except pinned ones. The right panel paginates its sections if the window is too short to
  show them all.
- **Help overlay.** The `?` button dims the page and labels every control on the frame
  with a leader line. The labels are the controls' own tooltips, so they always describe
  the current state rather than a second, separately maintained set of texts.
- **View persistence.** Your last map position is stored in the browser and restored on
  the next visit.
- **Shareable positions.** A MapLibre-style `#zoom/lat/lon/bearing/pitch` fragment is read
  on load, or when pasted into an already open page, and then removed from the URL.

**Caveats**

- The tool is **desktop only**. Mobile browsers get a short message instead of the map;
  the interface is built around a large viewport and a mouse.
- The view is stored per browser in local storage, so it does not follow you between
  devices, and clearing site data resets it.
- The URL is not kept in sync with the map. It is read once and cleared, so you cannot
  copy the address bar to share your current position; construct the fragment yourself.

---

# 3. Technology and architecture

## Overview

```
  browser
    | static files (no bundler)
    | POST /download
    v
  +---------------------------+        +----------------------------+
  |  map-town-parser          |  JDBC  |  osm-db                    |
  |  Quarkus uber-jar, JRE 25 |------->|  MariaDB 12.3              |
  |  port 8080                |        |  places.osm_place          |
  +---------------------------+        +----------------------------+
    |
    | HTTPS, 25 tiles per request
    v
  s3.amazonaws.com/elevation-tiles-prod  (Mapzen Terrarium)


  built separately, offline:

  planet-YYMMDD.osm.pbf -> osm-data-extractor -> osm_places_slim.sql.gz -> osm-db
```

## Backend

| | |
| --- | --- |
| Language | Java 25 |
| Framework | Quarkus 3.35.2, packaged as an uber-jar |
| Extensions | `quarkus-rest-jackson`, `quarkus-arc`, `quarkus-smallrye-health` |
| Database driver | `mariadb-java-client` |
| API | a single `POST /download` |
| Health | `/q/health/live`, `/q/health/ready` |

The API takes one JSON request describing the framed area (centre, rotation, widths, sea
level settings, town granularity) and returns either a PNG or a ZIP, with the filename in
the `Content-Disposition` header.

The processing pipeline lives in plain static classes rather than CDI beans:

- `HeightMapSupplier` - fetches and stitches the elevation tiles
- `ElevationCalculator` - decodes Terrarium pixels, removes noise, crops
- `ImageTransformer` - rotates, cuts out, rescales, normalises to sea level
- `TownParser` / `OSMdataSupplier` - queries and transforms the town data
- `CoordinateCalculator` - the shared geometry, including antimeridian handling
- `Constants` - every tunable parameter in one place

## Frontend

Plain, unbundled JavaScript served straight out of `META-INF/resources`, which Quarkus
exposes at the web root. There is no transpiler, bundler, minifier or test runner.

| | |
| --- | --- |
| Map | MapLibre GL 5.24.0 |
| DOM helper | jQuery 4.0.0 |
| Base map tiles | OpenStreetMap raster tiles |
| Fonts and chrome | OpenTTD-Sans, with PNG window images |

Both libraries are vendored into `assets/vendor` rather than loaded from a CDN. They are
copied out of `node_modules` by `npm run copy-assets`; `package.json` exists only to pin
those two versions.

Layout is driven almost entirely by viewport-relative units, so the whole interface scales
with the window.

## Elevation data (Mapzen Terrarium)

Heightmaps are built from the **Terrarium** tile set in Amazon's Terrain Tiles open data
registry, served from `s3.amazonaws.com/elevation-tiles-prod`. Each 256 x 256 PNG encodes
elevation in its colour channels:

```
elevation in metres = red * 256 + green + blue / 256 - 32768
```

For every request the backend fetches a **5 x 5 block of tiles** at two zoom levels above
the chosen heightmap zoom, centred on the framed area, stitches them into a 1280 x 1280
grid and crops the central 1024 x 1024. The 25 tiles are fetched concurrently, and decoded
tiles are cached in memory, keyed by tile position and zoom, so panning around a region
reuses most of them.

Terrarium itself is a mosaic of public sources - SRTM, the USGS National Elevation
Dataset, various national surveys and bathymetry sets - which is why the effective
accuracy varies by region.

**Caveats**

- The tile cache is a process-wide, **unbounded** in-memory map. It never expires, so
  memory use grows with the variety of areas requested over the lifetime of the process.
  Moving it into the database is on the roadmap.
- Tiles are always fetched as a 5 x 5 block, even when rotation and cut-out mean that some
  of them cannot contribute to the result.
- A failed tile request fails the whole generation; there is no retry.

## Town data (OpenStreetMap to MariaDB)

Town data is **not** fetched live. Querying a live API per request was too slow and too
impolite to the public services, so the data is extracted once, offline, into a local
database that the application only ever reads from.

### The extractor

`osm-data-extractor/` is a self-contained Debian image with `osmium-tool` and
`python3-icu`. It reads the newest `*.osm.pbf` planet file mounted at `/planet` and writes
a gzipped MariaDB dump:

```bash
cd osm-data-extractor
# put planet-YYMMDD.osm.pbf into data/input/
docker compose run --rm extractor
# -> data/output/osm_places_slim.sql.gz
```

1. `osmium tags-filter` keeps only nodes tagged `place=city|town|village|suburb`. This is
   the single expensive step, a streaming pass over the planet taking 30 to 60 minutes,
   but very little memory.
2. `osmium export` writes those nodes as a GeoJSON sequence with stable ids.
3. `make_dump.py` parses each feature and emits SQL. It normalises the free-text
   `population` tag (handling `12,345`, `12.345`, `ca. 5000`, `5000 (2019)` and similar,
   and producing `NULL` rather than a wrong number when it cannot tell), transliterates
   names in unsupported scripts with ICU's `Any-Latin; Latin-ASCII`, and skips nameless
   places.

The keep-list of place types lives in `extract.sh` only, so the application's granularity
levels and the extraction stay in one place.

### The database

A single table, deliberately minimal:

```sql
CREATE TABLE osm_place (
    osm_id     BIGINT UNSIGNED NOT NULL,
    name       VARCHAR(255) NOT NULL,
    place      ENUM('city', 'town', 'village', 'suburb') NOT NULL,
    lat        DOUBLE NOT NULL,
    lon        DOUBLE NOT NULL,
    population INT UNSIGNED NULL,
    PRIMARY KEY (osm_id),
    KEY idx_place_lat_lon (place, lat, lon)
);
```

`db-init/load.sh -p <dump>` loads it into the running container, creating the `places`
schema and a read-only `mapparser` user. Queries are bounding-box lookups on that index,
with a split longitude predicate when the framed area crosses the antimeridian.

**Caveats**

- The data is a **snapshot**. It is only as current as the planet file it was built from,
  and refreshing it means re-running the extractor and reloading the dump.
- Application database credentials are currently compiled into `Constants.java`. Moving
  them into configuration is outstanding work for anyone self-hosting.

## Containers and deployment

`compose.yml` at the repository root brings up the two runtime services:

| Service | Image | Notes |
| --- | --- | --- |
| `map-town-parser` | built from the root `Dockerfile` | `eclipse-temurin:25-jre-alpine`, port 8080 |
| `osm-db` | `mariadb:12.3` | named volume `osm-data` |

The application reaches the database at `osm-db:3306` over the default compose network.

## Building and running

```bash
# frontend dependencies into assets/vendor
npm install
npm run copy-assets

# development, with live reload on http://localhost:8080
mvn quarkus:dev

# production jar -> target/quarkus-map-parser.jar
mvn clean package

# containers
docker build -t map-town-parser:latest .
docker compose up -d
```

Town generation needs the `osm-db` container to be populated first, as described above.
The heightmap side works without it.

## Repository layout

```
src/main/java/eu/nwk/map/townparser/
    rest/          REST resource, request record, orchestration
    generation/    heightmap assembly
    util/
        calculation/   geometry, elevation maths, image transforms
        external/      Terrarium tiles, database access
        output/        PNG, JSON and ZIP writers
    model/         Position, Town, TownSize, TileDataKey
    config/        Constants, every tunable in one file

src/main/resources/META-INF/resources/
    index.html     the entire page
    logic/         mapLogic, viewportControls, helpOverlay, requestHandler
    style/         one stylesheet per component
    images/        window chrome and the viewport frame
    assets/vendor/ vendored MapLibre and jQuery (generated, not committed)

osm-data-extractor/  the offline planet-to-MariaDB pipeline
build/copy-assets.js the only frontend build step
```

## Known limitations and roadmap

- Auto sea level mode is a placeholder; a real implementation, plus picking a point on the
  map to take its elevation as the cutoff, is planned.
- Maps are always square and always 1024 x 1024. Draggable, non-square framing is the
  largest planned feature.
- The elevation tile cache is unbounded and lives in memory.
- Per-country handling of transliterated versus English town names is planned.
- Advanced settings, exposing the normalisation parameters, are planned.
- There is no automated test suite.

## Licence

MIT. See [LICENSE](LICENSE).

This project is not affiliated with or endorsed by the OpenTTD developers, the
OpenStreetMap Foundation, or Amazon Web Services. Map data is copyright OpenStreetMap
contributors, available under the Open Database Licence.
