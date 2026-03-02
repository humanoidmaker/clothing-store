#!/usr/bin/env bash
set -euo pipefail

API_URL="${1:-http://localhost:3000/api}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$APP_DIR"

echo "== HumanoidMaker Mobile Bootstrap =="
echo "App directory: $APP_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node.js 18+ first." >&2
  exit 1
fi

if [[ ! -f .env.example ]]; then
  echo ".env.example missing in mobile-app directory." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

if grep -q '^EXPO_PUBLIC_API_URL=' .env; then
  sed -i.bak "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=$API_URL|" .env
  rm -f .env.bak
else
  echo "EXPO_PUBLIC_API_URL=$API_URL" >> .env
fi

echo "Installing npm dependencies..."
npm install

echo "Bootstrap completed."
echo "Next commands:"
echo "  npm run start"
echo "  npm run android"
echo "  npm run ios"
echo "  npm run web"
