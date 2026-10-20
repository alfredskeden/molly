#!/usr/bin/env bash
# Seeds the test Baby Buddy (e2e/docker-compose.yml) and writes API keys to e2e/.env.test.
# Idempotent: re-running keeps existing users, child and keys.
set -euo pipefail

cd "$(dirname "$0")"

vars=$(docker compose exec -T babybuddy sh -c '
  cd /app/www/public &&
  DJANGO_SETTINGS_MODULE=babybuddy.settings.base SECRET_KEY=$(cat /config/.secretkey) \
  python3 manage.py shell --no-imports' < seed.py | grep '^BB_')

printf 'BB_URL=http://localhost:4778\n%s\n' "$vars" > .env.test
cat .env.test
