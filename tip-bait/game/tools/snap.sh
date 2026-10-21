#!/bin/sh
# Build, then snapshot dist/ to .qa/<name>/ so QA runs aren't broken by concurrent rebuilds. Prints the QA_URL.
set -e
cd "$(dirname "$0")/.." && node build.mjs >/dev/null
N=${1:-snap}; D=../../.qa/$N; rm -rf "$D"; mkdir -p "$D"; cp -r dist/. "$D"/
echo "http://localhost:8124/.qa/$N/index.html?qa=1"
