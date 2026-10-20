#!/usr/bin/env bash
# Exports the web app and builds the nginx image, without any registry.
#   scripts/build-web-image.sh local  → loads molly-web:local into this machine's Docker
#   scripts/build-web-image.sh pi     → writes dist/molly-web-arm64.tar for `docker load` on the Pi
set -euo pipefail

target="${1:?usage: build-web-image.sh local|pi}"
cd "$(dirname "$0")/.."

pnpm --filter @molly/app export:web
node scripts/check-web-bundle.mjs

case "$target" in
  local)
    docker build --file docker/Dockerfile --tag molly-web:local .
    ;;
  pi)
    mkdir -p dist
    docker build --platform linux/arm64 --file docker/Dockerfile --tag molly-web:local .
    docker save --output dist/molly-web-arm64.tar molly-web:local
    echo "Copy dist/molly-web-arm64.tar and docker/compose.yml to the Pi, then: docker load < molly-web-arm64.tar"
    ;;
  *)
    echo "usage: build-web-image.sh local|pi" >&2
    exit 1
    ;;
esac
