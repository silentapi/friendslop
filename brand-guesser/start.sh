#!/usr/bin/env bash
# CHAINED: one command to run the game on port 7090.
#
#   ./start.sh            start (or restart) inside a detached `screen` session named "chained"
#   ./start.sh attach     attach to it (detach again with Ctrl-a d)
#   ./start.sh stop       stop it
#   ./start.sh fg         run in the foreground (what the screen session runs; also fine inside your own screen)
#
# Env: PORT (default 7090), HOST (default 0.0.0.0), CHAINED_ADMIN_PASSWORD (else one is generated
# into var/admin_password on first run), CHAINED_TRUST_PROXY=1 when behind Caddy/nginx.
set -euo pipefail
cd "$(dirname "$0")"
SESSION=chained
PORT="${PORT:-7090}"
mkdir -p var

case "${1:-start}" in
  fg)
    command -v python3 >/dev/null || { echo "python3 not found: sudo apt install python3"; exit 1; }
    python3 -c 'import sys; sys.exit(sys.version_info < (3, 10))' || { echo "need Python 3.10+ (Ubuntu 22.04 or newer)"; exit 1; }
    extra=()
    [ "${CHAINED_TRUST_PROXY:-0}" = 1 ] && extra+=(--trust-proxy)
    # keep it up: if the server ever crashes, restart it after 2s (Ctrl-C twice to really quit)
    while true; do
      python3 -m app.server --port "$PORT" "${extra[@]}" && break
      echo "server exited ($?), restarting in 2s… (Ctrl-C again to quit)"
      sleep 2
    done
    ;;
  start)
    command -v screen >/dev/null || { echo "screen not found: sudo apt install screen   (or run: ./start.sh fg)"; exit 1; }
    if screen -list | grep -q "[.]$SESSION[[:space:]]"; then
      echo "restarting existing '$SESSION' session…"
      screen -S "$SESSION" -X quit || true
      sleep 1
    fi
    screen -dmS "$SESSION" -L -Logfile var/server.log bash -c "PORT=$PORT ./start.sh fg"
    sleep 1.5
    if screen -list | grep -q "[.]$SESSION[[:space:]]"; then
      ip=$(hostname -I 2>/dev/null | awk '{print $1}')
      echo "CHAINED is running in screen session '$SESSION' on port $PORT"
      echo "  play:   http://${ip:-localhost}:$PORT/"
      echo "  admin:  http://${ip:-localhost}:$PORT/admin   (user: admin, password: $( [ -n "${CHAINED_ADMIN_PASSWORD:-}" ] && echo '$CHAINED_ADMIN_PASSWORD' || echo "cat var/admin_password"))"
      echo "  logs:   tail -f var/server.log      attach: ./start.sh attach      stop: ./start.sh stop"
    else
      echo "failed to start; last log lines:"; tail -n 20 var/server.log 2>/dev/null || true; exit 1
    fi
    ;;
  attach) exec screen -r "$SESSION" ;;
  stop)   screen -S "$SESSION" -X quit && echo "stopped" || echo "not running" ;;
  *) echo "usage: ./start.sh [start|attach|stop|fg]"; exit 1 ;;
esac
