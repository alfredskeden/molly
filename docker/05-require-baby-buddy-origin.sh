#!/bin/sh
# Runs before the nginx entrypoint templates the CSP: refuse to start without a usable origin.
set -e

case "${BABY_BUDDY_ORIGIN:-}" in
  "")
    echo "molly-web: set BABY_BUDDY_ORIGIN to Baby Buddy's origin, e.g. https://baby.example.com" >&2
    exit 1
    ;;
esac

# scheme://host[:port] only: a path, space, quote or ; would change the CSP.
if ! echo "$BABY_BUDDY_ORIGIN" | grep -Eq '^https?://[A-Za-z0-9.-]+(:[0-9]+)?$'; then
  echo "molly-web: BABY_BUDDY_ORIGIN must look like https://baby.example.com, got: $BABY_BUDDY_ORIGIN" >&2
  exit 1
fi
