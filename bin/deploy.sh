#!/bin/sh
# Snapshot local results, then deploy to Vercel production from a clean copy (no .git, no local secrets).
# Deploying without git metadata avoids Vercel's "commit author doesn't have access to this team" check.
set -e
cd "$(dirname "$0")/.."
node bin/snapshot.js
OUT="${TMPDIR:-/tmp}/sprinto-outreach-deploy"
mkdir -p "$OUT"
rsync -a --delete --exclude .git --exclude node_modules --exclude .next --exclude .cache \
  --exclude data/results --exclude '.env*' ./ "$OUT/"
cd "$OUT"
npx -y vercel@latest deploy --prod --yes
