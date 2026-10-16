# VTS

File in this directory are sourced from https://github.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets

VTS_OUTDOOR_URL=https://raw.githubusercontent.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets/main/OS_VTS_3857_Outdoor.json
VTS_DARK_URL=https://raw.githubusercontent.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets/main/OS_VTS_3857_Dark.json
VTS_BLACK_AND_WHITE_URL=https://raw.githubusercontent.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets/main/OS_VTS_3857_Black_and_White.json

# Country boundaries

The [Office for National Statistics provides full-resolution boundaries](https://www.ons.gov.uk/methodology/geography/geographicalproducts/digitalboundaries) in two coastal forms.
We use "BFE" a full resolution — extent of the realm and generally extends to Mean Low Water rather than clipping at Mean High Water.

The latest version of the data is from 2025 and can be found at the following links:

https://geoportal.statistics.gov.uk/datasets/591803c2a3b94804a3d7895cc127d7c0_0/explore?location=50.529309%2C-4.098782%2C7

Download from: http://geoportal.statistics.gov.uk/ or https://geoportal.statistics.gov.uk/datasets/ons::countries-december-2025-boundaries-uk-bfe/about

The source data is for the 2025 revision is 179MB so needs to be reduced to allow rendering in a Web map and used for validation on the server. The downloaded file is named `boundaries-bfe.geojson`. `org2ogr` is used to produce two files:

## Server-side validation (boundaries-bfe-5dp.geojson)

This is the full file but with coordinate precision reduced from 14 to 5 decimal places, resulting in a smaller file of 83.7MB.
This data is then used server-side to validate points, shapes and lines that include country restrictions.

`ogr2ogr --config OGR_GEOJSON_MAX_OBJ_SIZE 0 -f GeoJSON boundaries-bfe-5dp.geojson boundaries-bfe.geojson -lco COORDINATE_PRECISION=5`

## Client-side display on map (boundaries-bfe-5dp.geojson)

To produce a file suitable for use in the map in the browser we use `ogr2ogr`'s `simplify` option.

`-simplify 0.001` uses the units of the input CRS. In EPSG:4326, that's degrees, not metres so a tolerance of 0.001° is roughly 111 metres north–south, which is quite a substantial simplification for coastal boundaries. For 0.001 to mean approximately one metre, we have to reproject to a suitable projected CRS (BNG, EPSG:27700) before simplifying:

The following command produces `boundaries-bng.geojson`, the source file reprojected to BNG.

`ogr2ogr --config OGR_GEOJSON_MAX_OBJ_SIZE 0 -f GeoJSON boundaries-bng.geojson boundaries-bfe.geojson -t_srs EPSG:27700`

We then use this to create a simplified dataset, `countries.geojson`, reprojected back in ESPG:4326:

`ogr2ogr --config OGR_GEOJSON_MAX_OBJ_SIZE 0 -f GeoJSON countries.geojson boundaries-bng.json -simplify 100 -t_srs EPSG:4326 -lco COORDINATE_PRECISION=5`

The result is a file of 940kB that is suitable to use in the web map.
