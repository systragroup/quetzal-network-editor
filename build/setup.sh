#!/bin/sh
set -e
cd "$(dirname "$0")"/..
if [ ! -e src/config.js ]; then
  if [ -z "$MAPBOX_TOKEN" ]; then
    echo -n "(MAPBOX_TOKEN) Mapbox public access token: "
    read -r MAPBOX_TOKEN
  fi
  if [ -z "$BACK_URI" ]; then
    BACK_URI='http://localhost:8000/graphql/'
  fi
  sed -r \
    -e "s|###MAPBOX_PUBLIC_KEY###|$MAPBOX_TOKEN|;" \
    -e "s|###BACK_URI###|$BACK_URI|;" \
    src/config.js.dist > src/config.js
fi
