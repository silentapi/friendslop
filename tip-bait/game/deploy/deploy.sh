#!/usr/bin/env bash
# Build the self-hosted game and push it to a VPS over SSH.
#   ./tip-bait/game/deploy/deploy.sh user@your-vps.com /var/www/html/tip-bait [ssh-port]
# The folder is served as plain static files: drop it under any existing site (e.g. yoursite.com/tip-bait/).
set -euo pipefail
DEST_HOST="${1:?usage: deploy.sh user@host /remote/web/path [port]}"
DEST_PATH="${2:?usage: deploy.sh user@host /remote/web/path [port]}"
PORT="${3:-22}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"   # tip-bait/
[ -f "$ROOT/node_modules/three/package.json" ] || (cd "$ROOT" && npm i --no-save --no-package-lock three@0.169.0)
node "$ROOT/game/build.mjs"
ssh -p "$PORT" "$DEST_HOST" "mkdir -p '$DEST_PATH'"
rsync -az --delete -e "ssh -p $PORT" "$ROOT/game/dist-site/" "$DEST_HOST:$DEST_PATH/"
echo "Deployed to $DEST_HOST:$DEST_PATH"
