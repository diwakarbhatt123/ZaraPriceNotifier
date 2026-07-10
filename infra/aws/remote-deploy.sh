#!/usr/bin/env bash
set -Eeuo pipefail

COMMIT_SHA=${1:?Usage: remote-deploy.sh COMMIT_SHA [BRANCH]}
BRANCH=${2:-V1}
SOURCE_REPO=/opt/zara-notifier
RELEASES_DIR=/opt/zara-notifier-releases
CURRENT_LINK=/opt/zara-notifier-current
RELEASE_DIR="$RELEASES_DIR/$COMMIT_SHA"
PREVIOUS_TARGET=$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)

log() { printf '[deploy] %s\n' "$*"; }

rollback() {
  local exit_code=$?
  trap - ERR
  log "Deployment failed (exit $exit_code). Rolling back."
  if [[ -n "$PREVIOUS_TARGET" && -d "$PREVIOUS_TARGET" ]]; then
    ln -sfn "$PREVIOUS_TARGET" "$CURRENT_LINK"
    systemctl daemon-reload
    systemctl restart zara-notifier.service zara-notifier-web.service || true
  fi
  exit "$exit_code"
}
trap rollback ERR

if [[ ! "$COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Commit SHA must be a full 40-character Git SHA." >&2
  exit 2
fi

install -d -o ubuntu -g ubuntu "$RELEASES_DIR"
git config --global --add safe.directory "$SOURCE_REPO"

log "Fetching $BRANCH and commit $COMMIT_SHA"
sudo -u ubuntu git -C "$SOURCE_REPO" fetch --prune origin "$BRANCH"
sudo -u ubuntu git -C "$SOURCE_REPO" cat-file -e "$COMMIT_SHA^{commit}"

if [[ ! -d "$RELEASE_DIR" ]]; then
  sudo -u ubuntu git -C "$SOURCE_REPO" worktree add --detach "$RELEASE_DIR" "$COMMIT_SHA"
fi

log "Installing backend dependencies"
sudo -u ubuntu env HOME=/home/ubuntu \
  PUPPETEER_CACHE_DIR=/home/ubuntu/.cache/puppeteer \
  npm --prefix "$RELEASE_DIR" ci --omit=dev

log "Building Next.js frontend"
sudo -u ubuntu env HOME=/home/ubuntu npm --prefix "$RELEASE_DIR/web" ci
sudo -u ubuntu env HOME=/home/ubuntu NODE_OPTIONS=--max-old-space-size=768 \
  npm --prefix "$RELEASE_DIR/web" run build

# Migrate instances created before versioned releases were introduced.
sed -i 's|WorkingDirectory=/opt/zara-notifier/web|WorkingDirectory=/opt/zara-notifier-current/web|' \
  /etc/systemd/system/zara-notifier-web.service
sed -i 's|WorkingDirectory=/opt/zara-notifier$|WorkingDirectory=/opt/zara-notifier-current|' \
  /etc/systemd/system/zara-notifier.service

log "Activating $COMMIT_SHA"
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"
systemctl daemon-reload
systemctl restart zara-notifier.service zara-notifier-web.service

for attempt in {1..30}; do
  if curl --fail --silent --show-error http://127.0.0.1:8080/health >/dev/null \
    && curl --fail --silent --show-error http://127.0.0.1:3000/ >/dev/null; then
    log "Health checks passed"
    break
  fi
  if [[ "$attempt" == 30 ]]; then
    echo "Services did not become healthy within 60 seconds." >&2
    false
  fi
  sleep 2
done

trap - ERR

log "Removing old releases (keeping the newest three)"
mapfile -t OLD_RELEASES < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
  | sort -rn | tail -n +4 | cut -d' ' -f2-)
for old_release in "${OLD_RELEASES[@]}"; do
  if [[ "$old_release" != "$PREVIOUS_TARGET" ]]; then
    sudo -u ubuntu git -C "$SOURCE_REPO" worktree remove --force "$old_release" || true
  fi
done
sudo -u ubuntu git -C "$SOURCE_REPO" worktree prune
log "Deployment complete: $COMMIT_SHA"
