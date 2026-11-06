# UK Country Boundary GeoJSON Builder

A Python script for building lightweight GeoJSON representations of the
four UK countries:

- England
- Scotland
- Wales
- Northern Ireland

The script produces a detailed, buffered representation and three
progressively coarser generalisations (2 km, 5 km and 10 km). The
outputs are intended for lightweight mapping and permissive geographic
validation, rather than as authoritative legal or administrative
boundaries.

## What the script produces

In its default mode, the script reads an Ordnance Survey/ONS-style
Countries BFE GeoJSON source and writes four GeoJSON FeatureCollections:

---

File Description

---

`country-boundaries-simplified.geojson` Detailed generalised boundary

`country-boundaries-coarse-2km.geojson` Coarse 2 km generalisation

`country-boundaries-coarse-5km.geojson` Coarse 5 km generalisation

`country-boundaries-coarse-10km.geojson` Coarsest generalisation

---

Each output contains one feature for each of the four countries. The
script carries across each source feature's `properties` and, when
present, its `id`.

The 2 km, 5 km and 10 km values are simplification tolerances in metres.
They are not claims about positional accuracy.

## Requirements

- Python 3

See also [requirements.txt](./requirements.txt)

Install the dependencies:

```bash
python3 -m pip install "shapely>=2.0" "pyproj>=3.5" ijson
```

On some Linux distributions, Python packages may be managed by the
operating system. If `pip` reports that the environment is externally
managed, use a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install "shapely>=2.0" "pyproj>=3.5" ijson
```

## Usage

First download the [original ONS source](https://geoportal.statistics.gov.uk/datasets/ons::countries-december-2025-boundaries-uk-bfe/about) and save to a `source` directory.

### 1. Build all four outputs from the original ONS source

Run from the directory where you want the output directory to be
created:

```bash
python3 build_country_boundaries_all.py \
  --source=./source/Countries_December_2025_Boundaries_UK_BFE_-7077855553642281249.geojson \
  --out-dir=./boundary-output
```

The output directory is created if it does not already exist.

This mode: 1. Streams the source GeoJSON feature-by-feature using
`ijson`. 2. Identifies the England, Scotland, Wales and Northern Ireland
features from their properties. 3. Projects each country to a suitable
metric coordinate reference system. 4. Builds the detailed geometry. 5.
Builds the 2 km, 5 km and 10 km versions from that detailed geometry. 6.
Validates the geometries and checks that each generated version covers
the geometry it is required to cover. 7. Writes the outputs after all
four countries have passed.

The original large source is not loaded into memory as one complete JSON
document. Each country is processed individually.

### 2. Build only the coarse outputs from an existing detailed GeoJSON

If `country-boundaries-simplified.geojson` has already been created, it
can be used as the input to generate the three coarser versions:

```bash
python3 build_country_boundaries_all.py \
  --source=./country-boundaries-simplified.geojson \
  --source-is-base \
  --out-dir=./boundary-output
```

In this mode, the script produces only:

- `country-boundaries-coarse-2km.geojson`
- `country-boundaries-coarse-5km.geojson`
- `country-boundaries-coarse-10km.geojson`

The input is a small GeoJSON file, so the script can read it with
Python's standard JSON library if `ijson` is not installed.

## Processing approach

### Coordinate reference systems

The script uses metric projected coordinates for simplification and
buffering:

Country Projected CRS

---

England EPSG:27700 --- British National Grid
Scotland EPSG:27700 --- British National Grid
Wales EPSG:27700 --- British National Grid
Northern Ireland EPSG:2157 --- Irish Transverse Mercator

Generated geometries are transformed back to WGS84 (EPSG:4326) for
GeoJSON output.

### Detailed output

The detailed geometry is created using these default parameters:

- Simplification tolerance: 500 metres
- Additional outward buffer: 300 metres
- Safety margin: 5 metres
- Buffer resolution: 8 segments per quadrant
- WGS84 precision grid: 6 decimal places

The script simplifies the original projected geometry first, then
buffers the simplified result outward by the sum of the simplification
tolerance, additional buffer and safety margin (805 metres with the
defaults).

### Coarse outputs

Each coarse output is generated from the detailed geometry, not directly
from the original ONS source.

For each tolerance, the script: 1. Simplifies the detailed geometry
using topology-preserving simplification. 2. Buffers it outward by the
simplification tolerance plus an additional 500 metres by default. 3.
Transforms it to WGS84. 4. Applies a valid-output precision reduction to
a six-decimal-place grid. 5. Checks that the resulting geometry covers
the detailed input geometry.

The default coarse buffer resolution is 2 segments per quadrant. This
produces simpler rounded buffer shapes and contributes to the smaller
output files.

## Validation and output safety

For every country, the script checks that:

- The source geometry is non-empty and valid.
- Projected and simplified geometries are non-empty and valid.
- Buffered geometries are non-empty and valid.
- Precision reduction produces a non-empty, valid geometry.
- The final output, transformed back into the country's projected CRS,
  covers the geometry it is intended to contain.

In the default mode, the detailed output must cover the original
projected source geometry. Each coarse output must cover the detailed
geometry.

The script expects exactly one recognised feature for each of the four
countries. It stops if a country is missing or appears more than once.

Output is first written to temporary files ending in `.tmp`. The final
filenames are published only after all four countries have passed the
checks. If processing fails, the temporary files are removed.

The script reports peak resident memory usage (RSS) as reported by
Linux.

## Command-line options

---

Option Default Description

---

`--source` Required Input GeoJSON file

`--out-dir` `.` Directory for generated files

`--source-is-base` Off Treat the input as
the already-built
detailed GeoJSON and
generate only coarse
outputs

`--base-tolerance` `500` Simplification
tolerance for the
detailed output, in
metres

`--buffer` `300` Additional
detailed-output
buffer, in metres

`--safety-margin` `5` Additional
detailed-output
safety margin, in
metres

`--precision` `6` WGS84 precision grid
in decimal places

`--base-quad-segs` `8` Buffer segments per
quadrant for the
detailed output

`--coarse-buffer-extra` `500` Extra buffer added to
each coarse
simplification
tolerance, in metres

`--coarse-quad-segs` `2` Buffer segments per
quadrant for coarse
outputs

---

The three coarse tolerances are currently fixed in the script at 2,000,
5,000 and 10,000 metres.

For example, to change the detailed output's simplification tolerance:

```bash
python3 build_country_boundaries_all.py \
  --source=./source/Countries_December_2025_Boundaries_UK_BFE_-7077855553642281249.geojson \
  --base-tolerance=750 \
  --out-dir=./boundary-output
```

Changing parameters changes the generated geometries. Always review the
output and rely on the script's containment checks rather than assuming
that a particular buffer distance guarantees coverage.

## Important limitations

These files are deliberately generalised and buffered. They are useful
as broad geographic envelopes for map display or an initial validation
stage, but they are **not authoritative country boundaries**.

Because the geometries are buffered outwards, a point or drawn feature
outside the actual national boundary may still be accepted. This is
intentional for a permissive validation envelope. Do not use these
outputs where precise legal, cadastral, planning or administrative
boundary decisions are required.

The containment checks prove that the generated geometry covers its
input geometry after the processing and precision-reduction steps. They
do not prove that every location inside the generated envelope is within
the legal territory of the country.

## Troubleshooting

### `ijson` is missing

Install it with:

```bash
python3 -m pip install ijson
```

It is needed for the original large source file. It is optional when
using `--source-is-base`.

### A geometry fails validation or containment

The script stops and reports the country and processing stage. No new
final output set is published. Review the input and parameters before
trying again; do not simply remove the validation checks.

### Deprecation warning from Shapely

Depending on the installed Shapely version, a deprecation warning may be
shown for `shapely.ops.transform`. It is a warning rather than a
processing failure. The script's geometry validation and containment
checks determine whether the build succeeds.

## Output integration

The output files are standard GeoJSON FeatureCollections in WGS84
longitude/latitude coordinates (EPSG:4326). They can be loaded by tools
that support GeoJSON, including Node.js applications using Turf.js.

For the broad, permissive validation use case, start by testing
`country-boundaries-coarse-10km.geojson`. Keep the original source data
separately if authoritative or more detailed boundary information is
needed.
