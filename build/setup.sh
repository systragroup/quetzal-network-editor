#!/bin/sh
set -e
cd "$(dirname "$0")"/..
if [ ! -e src/config.js ]; then
  if [ -z "$MAPBOX_TOKEN" ]; then
    echo -n "(MAPBOX_TOKEN) Mapbox public access token: "
    read -r MAPBOX_TOKEN
  fi
  if [ -z "$BACK_URL" ] && [ -z "$BACK_FIRST_PART" ]; then
    DEFAULT_BACK_URL='http://localhost:8000/'
    echo -n "(BACK_URL) Backend URL: [$DEFAULT_BACK_URL] "
    read BACK_URL
    if [ -z "$BACK_URL" ]; then
      BACK_URL="$DEFAULT_BACK_URL"
    fi
  fi
  sed -r \
    -e "s|###MAPBOX_PUBLIC_KEY###|$MAPBOX_TOKEN|;" \
    -e "s|###BACK_FIRST_PART###|$BACK_FIRST_PART|;" \
    -e "s|###BACK_URL###|$BACK_URL|;" \
    src/config.js.dist > src/config.js
fi
