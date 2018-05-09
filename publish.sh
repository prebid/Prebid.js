#!/usr/bin/env bash

if [[ "$1" != "" ]]; then
    filename="$1"
else
    echo "No filename was provided. Please provide a filename before continuing..."
    exit 1
fi

domain="a.pub.network"

if [[ "$2" != "" ]]; then
    domain="$2"
fi

echo "Copying $filename now..."

gsutil cp build/dist/prebid.js gs://${domain}/core/$filename

gsutil setmeta -h "Cache-Control:private" -h "Content-Type:text/html" gs://${domain}/core/$filename

gsutil acl ch -u AllUsers:R gs://${domain}/core/$filename
