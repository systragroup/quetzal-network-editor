#!/bin/sh
if [ -e /tmp/front.env ]; then
  # shellcheck disable=SC1091
  . /tmp/front.env
  # shellcheck disable=SC2013
  for key in $(sed -rn '/[^#].+=/{s/=.*//;p}' /tmp/front.env); do
    eval "export $key"
  done
fi
if [ -n "$VIRTUAL_HOST" ]; then
  first_part="$(echo "$VIRTUAL_HOST"|cut -d. -f1)"
  back_suffix='-back'
  echo "analyzing front first part $first_part..."
  if echo "$first_part" | grep -qE '.*-(dev|integ|staging|demo)$'; then
    env_suffix="$(echo "$first_part"|sed -r 's/.*(-[a-z]+)$/\1/')"
    first_part="$(echo "$first_part"|sed -r 's/(.*)-[a-z]+$/\1/')"
  fi
  BACK_FIRST_PART="${first_part}${back_suffix}${env_suffix}"
  echo "setting back first part to $BACK_FIRST_PART"
  sed -ri "s|XXXXXX|$BACK_FIRST_PART|" /usr/share/nginx/html/*.config.js
fi
if [ -n "$MAPBOX_TOKEN" ]; then
  sed -ri "s|###MAPBOX_PUBLIC_KEY###|$MAPBOX_TOKEN|" /usr/share/nginx/html/*.config.js
fi
