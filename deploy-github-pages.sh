#!/bin/bash

# GitHub Pages Deployment Script
# Deploys the Echo Ads demo to GitHub Pages

set -e

PREBID_BUNDLE="build/dev/prebid.js"
DOCS_DIR="docs"

echo "🚀 Deploying Echo Ads Demo to GitHub Pages..."

# Check if prebid bundle exists
if [ ! -f "$PREBID_BUNDLE" ]; then
    echo "⚠️  Prebid bundle not found, building now..."
    npx gulp build-bundle-dev --modules=echoAdsModule,gumgumBidAdapter --nolint

    if [ ! -f "$PREBID_BUNDLE" ]; then
        echo "❌ Error: Build failed, bundle still not found"
        exit 1
    fi
fi

# Copy prebid.js to docs folder
echo "📤 Copying prebid.js to docs folder..."
cp "$PREBID_BUNDLE" "$DOCS_DIR/prebid.js"

# Commit and push
echo "📝 Committing changes..."
git add "$DOCS_DIR/prebid.js" "$DOCS_DIR/index.html" "$DOCS_DIR/creatives/"
git commit -m "Update GitHub Pages demo" || echo "No changes to commit"
git push origin master

echo "✅ Deployment complete!"
echo ""
echo "🌐 Demo URL: https://gumgum.github.io/echoads/"
echo ""
echo "💡 Note: GitHub Pages may take 1-2 minutes to update"
