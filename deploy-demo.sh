#!/bin/bash

# Echo Ads Demo Deployment Script
# Deploys the Echo Ads demo to Google Cloud Storage

set -e

PROJECT_ID="jono-sandbox"
BUCKET_NAME="echoads-demo"
DEMO_FILE="integrationExamples/gpt/echoAds_gumgum.html"
PREBID_BUNDLE="build/dev/prebid.js"

echo "🚀 Deploying Echo Ads Demo to Google Cloud Storage..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "❌ Error: gsutil is not installed"
    echo "Install gcloud SDK to get gsutil"
    exit 1
fi

# Set the correct GCloud project
echo "📋 Setting GCloud project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Check if files exist
if [ ! -f "$DEMO_FILE" ]; then
    echo "❌ Error: Demo file not found at $DEMO_FILE"
    exit 1
fi

if [ ! -f "$PREBID_BUNDLE" ]; then
    echo "⚠️  Prebid bundle not found, building now..."
    npx gulp build-bundle-dev --modules=echoAdsModule,gumgumBidAdapter --nolint

    if [ ! -f "$PREBID_BUNDLE" ]; then
        echo "❌ Error: Build failed, bundle still not found"
        exit 1
    fi
fi

# Create temporary HTML with corrected paths for deployment
echo "📝 Preparing deployment HTML..."
TEMP_HTML=$(mktemp)
sed 's|../../build/dev/prebid.js|https://storage.googleapis.com/'"$BUCKET_NAME"'/build/dev/prebid.js|g' "$DEMO_FILE" > "$TEMP_HTML"

# Upload files with public read permissions
echo "📤 Uploading demo HTML..."
gsutil -h "Content-Type:text/html" cp "$TEMP_HTML" gs://$BUCKET_NAME/index.html
gsutil acl ch -u AllUsers:R gs://$BUCKET_NAME/index.html

echo "📤 Uploading Prebid.js bundle..."
gsutil -h "Content-Type:application/javascript" cp "$PREBID_BUNDLE" gs://$BUCKET_NAME/build/dev/prebid.js
gsutil acl ch -u AllUsers:R gs://$BUCKET_NAME/build/dev/prebid.js

# Clean up temp file
rm "$TEMP_HTML"

# Set cache control headers for demo (no-store ensures always fresh content)
echo "⚙️  Setting cache headers..."
gsutil setmeta -h "Cache-Control:no-store, no-cache, must-revalidate" gs://$BUCKET_NAME/index.html
gsutil setmeta -h "Cache-Control:no-store, no-cache, must-revalidate" gs://$BUCKET_NAME/build/dev/prebid.js
gsutil setmeta -h "Cache-Control:no-store, no-cache, must-revalidate" gs://$BUCKET_NAME/creatives/acme.png 2>/dev/null || true

echo "✅ Deployment complete!"
echo ""
echo "🌐 Demo URL: https://storage.googleapis.com/$BUCKET_NAME/index.html"
echo ""
echo "💡 Tips:"
echo "  - Clear browser cache if you don't see updates"
echo "  - Use incognito/private mode for fresh testing"
echo "  - Check browser console for Echo Ads logs"
