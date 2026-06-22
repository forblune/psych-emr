#!/usr/bin/env bash
# Build and publish dist/ to the gh-pages branch (GitHub Pages).
# Usage: npm run deploy
set -euo pipefail

cd "$(dirname "$0")/.."
ORIGIN="$(git remote get-url origin)"

npm run build

cd dist
touch .nojekyll                 # serve assets as-is (no Jekyll)
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C .. config user.name)" \
    -c user.email="$(git -C .. config user.email)" \
    commit -q -m "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push -q -f "$ORIGIN" gh-pages
cd ..
rm -rf dist/.git

echo "✓ deployed to gh-pages"
