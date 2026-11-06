#!/usr/bin/env python3
"""Build detailed and coarser UK country-boundary GeoJSON files.

Default mode expects the original ONS Countries BFE GeoJSON. It creates:
  country-boundaries-simplified.geojson
  country-boundaries-coarse-2km.geojson
  country-boundaries-coarse-5km.geojson
  country-boundaries-coarse-10km.geojson

Use --source-is-base when --source is the already-built detailed GeoJSON. In
that mode only the three coarse files are produced.

Install:
  python3 -m pip install 'shapely>=2.0' 'pyproj>=3.5' ijson
"""
from __future__ import annotations

import argparse
import gc
import json
import os
import re
import resource
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any

try:
    import ijson
except ImportError:
    ijson = None
import shapely
from pyproj import Transformer
from shapely.geometry import mapping, shape
from shapely.ops import transform

COUNTRY_CRS = {
    "England": "EPSG:27700",
    "Northern Ireland": "EPSG:2157",
    "Scotland": "EPSG:27700",
    "Wales": "EPSG:27700",
}
DEFAULT_COARSE_TOLERANCES = (2000, 5000, 10000)


def norm(value: Any) -> str:
    return re.sub(r"[^a-z]", "", str(value).lower())


def identify_country(feature: dict) -> str | None:
    values = {
        norm(value)
        for value in (feature.get("properties") or {}).values()
        if isinstance(value, (str, int, float, Decimal))
    }
    for country in COUNTRY_CRS:
        if norm(country) in values:
            return country
    return None


def peak_rss_mib() -> float:
    # Linux reports ru_maxrss in KiB.
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0


def project(geom, source_crs: str, target_crs: str):
    transformer = Transformer.from_crs(source_crs, target_crs, always_xy=True)
    return transform(transformer.transform, geom)


def json_default(value: Any):
    """Convert ijson Decimal values to ordinary JSON numeric types."""
    if isinstance(value, Decimal):
        if value == value.to_integral_value():
            return int(value)
        return float(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def log(message: str) -> None:
    print(message, flush=True)


def feature_with_geometry(source_feature: dict, geom) -> dict:
    result = {
        "type": "Feature",
        "properties": source_feature.get("properties") or {},
        "geometry": mapping(geom),
    }
    if "id" in source_feature:
        result["id"] = source_feature["id"]
    return result


def precision_wgs84(geom, precision: int):
    grid = 10 ** (-precision)
    result = shapely.set_precision(geom, grid_size=grid, mode="valid_output")
    if result.is_empty or not result.is_valid:
        raise RuntimeError("WGS84 precision reduction produced empty/invalid geometry")
    return result


def make_detailed_geometry(original_projected, args, country: str):
    log(f"{country}: simplifying detailed source at {args.base_tolerance:g} m")
    simplified = original_projected.simplify(
        args.base_tolerance, preserve_topology=True
    )
    if simplified.is_empty or not simplified.is_valid:
        raise RuntimeError(f"{country}: detailed simplification produced invalid geometry")

    distance = args.base_tolerance + args.buffer + args.safety_margin
    log(f"{country}: buffering detailed geometry outward by {distance:g} m")
    buffered = simplified.buffer(distance, quad_segs=args.base_quad_segs)
    del simplified
    gc.collect()
    if buffered.is_empty or not buffered.is_valid:
        raise RuntimeError(f"{country}: detailed buffer produced invalid geometry")

    wgs84 = project(buffered, COUNTRY_CRS[country], "EPSG:4326")
    del buffered
    gc.collect()
    final = precision_wgs84(wgs84, args.precision)
    del wgs84
    gc.collect()

    log(f"{country}: checking detailed geometry covers original source")
    roundtrip = project(final, "EPSG:4326", COUNTRY_CRS[country])
    if not roundtrip.covers(original_projected):
        raise RuntimeError(f"{country}: detailed output does not cover original source")
    return final, roundtrip


def make_coarse_geometry(base_projected, tolerance: float, args, country: str):
    simplified = base_projected.simplify(tolerance, preserve_topology=True)
    if simplified.is_empty or not simplified.is_valid:
        raise RuntimeError(
            f"{country}: {tolerance:g} m simplification produced invalid geometry"
        )

    # The extra margin is deliberately retained from the detailed build's
    # buffer allowance. The final covers() check is authoritative.
    buffer_distance = tolerance + args.coarse_buffer_extra
    buffered = simplified.buffer(buffer_distance, quad_segs=args.coarse_quad_segs)
    del simplified
    gc.collect()
    if buffered.is_empty or not buffered.is_valid:
        raise RuntimeError(f"{country}: {tolerance:g} m buffer produced invalid geometry")

    wgs84 = project(buffered, COUNTRY_CRS[country], "EPSG:4326")
    del buffered
    gc.collect()
    final = precision_wgs84(wgs84, args.precision)
    del wgs84
    gc.collect()

    roundtrip = project(final, "EPSG:4326", COUNTRY_CRS[country])
    if not roundtrip.covers(base_projected):
        raise RuntimeError(
            f"{country}: {tolerance:g} m output does NOT cover the detailed geometry"
        )

    vertices = shapely.get_num_coordinates(final)
    log(
        f"{country}: {tolerance / 1000:g} km PASS; "
        f"{vertices:,} vertices; peak RSS={peak_rss_mib():,.0f} MiB"
    )
    del roundtrip
    return final


def write_feature(stream, feature: dict, first: bool) -> bool:
    if not first:
        stream.write(",\n")
    json.dump(
        feature,
        stream,
        ensure_ascii=False,
        separators=(",", ":"),
        default=json_default,
        allow_nan=False,
    )
    stream.flush()
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path, help="ONS BFE GeoJSON or detailed output")
    parser.add_argument("--out-dir", type=Path, default=Path("."), help="Directory for generated GeoJSON files")
    parser.add_argument(
        "--source-is-base", action="store_true",
        help="Input is the already-built detailed GeoJSON; generate only the coarse files",
    )
    parser.add_argument("--base-tolerance", type=float, default=500,
                        help="Detailed output simplification tolerance in metres (default: 500)")
    parser.add_argument("--buffer", type=float, default=300,
                        help="Detailed output additional margin in metres (default: 300)")
    parser.add_argument("--safety-margin", type=float, default=5,
                        help="Detailed output safety margin in metres (default: 5)")
    parser.add_argument("--precision", type=int, default=6,
                        help="WGS84 decimal places / precision grid (default: 6)")
    parser.add_argument("--base-quad-segs", type=int, default=8,
                        help="Buffer segments per quadrant for detailed output (default: 8)")
    parser.add_argument("--coarse-buffer-extra", type=float, default=500,
                        help="Extra outward buffer added after each coarse tolerance (default: 500 m)")
    parser.add_argument("--coarse-quad-segs", type=int, default=2,
                        help="Buffer segments per quadrant for coarse outputs (default: 2)")
    args = parser.parse_args()

    if not args.source.is_file():
        parser.error(f"Source file not found: {args.source}")
    if args.base_tolerance < 0 or args.buffer < 0 or args.safety_margin < 0:
        parser.error("base-tolerance, buffer and safety-margin must be non-negative")
    if args.coarse_buffer_extra < 0:
        parser.error("coarse-buffer-extra must be non-negative")
    if not 0 <= args.precision <= 12:
        parser.error("precision must be between 0 and 12")
    if args.base_quad_segs < 1 or args.coarse_quad_segs < 1:
        parser.error("quad-segs values must be at least 1")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    coarse_tolerances = DEFAULT_COARSE_TOLERANCES

    outputs: dict[str, Path] = {}
    if not args.source_is_base:
        outputs["detailed"] = args.out_dir / "country-boundaries-simplified.geojson"
    for tolerance in coarse_tolerances:
        label = f"{int(tolerance / 1000)}km"
        outputs[label] = args.out_dir / f"country-boundaries-coarse-{label}.geojson"

    if len(set(outputs.values())) != len(outputs):
        parser.error("Output paths are not unique")
    if args.source.resolve() in {path.resolve() for path in outputs.values()}:
        parser.error("An output path must not overwrite the input source")

    temporary_paths = {key: path.with_name(path.name + ".tmp") for key, path in outputs.items()}
    for path in temporary_paths.values():
        if path.exists():
            path.unlink()

    log(f"Input: {args.source}")
    log(f"Output directory: {args.out_dir}")
    if args.source_is_base:
        log("Mode: detailed GeoJSON input; generating 2, 5 and 10 km outputs only.")
    else:
        log("Mode: original ONS input; generating detailed plus 2, 5 and 10 km outputs.")
    log("Processing features as a stream; one country geometry at a time.")

    streams = {}
    first_flags = {key: True for key in outputs}
    seen: set[str] = set()
    try:
        for key, path in temporary_paths.items():
            streams[key] = path.open("w", encoding="utf-8")
            streams[key].write('{"type":"FeatureCollection","features":[\n')

        if ijson is None and not args.source_is_base:
            raise RuntimeError(
                "The ijson package is required for the original ONS source. "
                "Install it with: python3 -m pip install ijson"
            )

        if ijson is None:
            # The already-simplified input is small (normally under 1 MB), so
            # json.load is a safe fallback when ijson is not installed.
            with args.source.open("r", encoding="utf-8") as source_stream:
                input_features = json.load(source_stream).get("features", [])
            feature_iterator = iter(input_features)
        else:
            source_stream = args.source.open("rb")
            feature_iterator = ijson.items(source_stream, "features.item")

        try:
            for feature in feature_iterator:
                country = identify_country(feature)
                if country is None:
                    continue
                if country in seen:
                    raise RuntimeError(f"Duplicate feature found for {country}")

                source_geom = shape(feature["geometry"])
                if source_geom.is_empty or not source_geom.is_valid:
                    raise RuntimeError(f"{country}: source geometry is empty or invalid")
                source_vertices = shapely.get_num_coordinates(source_geom)
                crs = COUNTRY_CRS[country]
                log(f"\n{country}: input vertices={source_vertices:,}; projection={crs}")

                if args.source_is_base:
                    # The supplied WGS84 feature is the detailed geometry to be covered.
                    base_projected = project(source_geom, "EPSG:4326", crs)
                    if base_projected.is_empty or not base_projected.is_valid:
                        raise RuntimeError(f"{country}: projected detailed geometry is invalid")
                    base_wgs84 = source_geom
                else:
                    original_projected = project(source_geom, "EPSG:4326", crs)
                    del source_geom
                    gc.collect()
                    base_wgs84, base_projected = make_detailed_geometry(
                        original_projected, args, country
                    )
                    if "detailed" in streams:
                        detailed_feature = feature_with_geometry(feature, base_wgs84)
                        first_flags["detailed"] = write_feature(
                            streams["detailed"], detailed_feature, first_flags["detailed"]
                        )
                        del detailed_feature
                    del original_projected
                    gc.collect()

                base_vertices = shapely.get_num_coordinates(base_projected)
                log(f"{country}: detailed geometry vertices={base_vertices:,}")

                for tolerance in coarse_tolerances:
                    label = f"{int(tolerance / 1000)}km"
                    log(f"{country}: building {label} generalisation")
                    coarse = make_coarse_geometry(base_projected, tolerance, args, country)
                    coarse_feature = feature_with_geometry(feature, coarse)
                    first_flags[label] = write_feature(
                        streams[label], coarse_feature, first_flags[label]
                    )
                    del coarse_feature, coarse
                    gc.collect()

                seen.add(country)
                del feature, base_wgs84, base_projected
                if args.source_is_base:
                    del source_geom
                gc.collect()
        finally:
            if ijson is not None:
                source_stream.close()

        missing = set(COUNTRY_CRS) - seen
        if missing:
            raise RuntimeError("Missing country feature(s): " + ", ".join(sorted(missing)))

        for stream in streams.values():
            stream.write("\n]}\n")
            stream.flush()
            os.fsync(stream.fileno())
            stream.close()
        streams.clear()

        # Publish only after every country passed every requested validation.
        for key, temporary in temporary_paths.items():
            temporary.replace(outputs[key])

    except Exception:
        for stream in streams.values():
            try:
                stream.close()
            except Exception:
                pass
        for temporary in temporary_paths.values():
            if temporary.exists():
                temporary.unlink()
        raise

    log("\nSUCCESS: all four countries passed all requested containment checks.")
    for key, path in outputs.items():
        log(f"  {path} ({path.stat().st_size:,} bytes)")
    log(f"Peak RSS: {peak_rss_mib():,.0f} MiB")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr, flush=True)
        raise SystemExit(1)
