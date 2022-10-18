#!/usr/bin/env bash

if [[ "$1" != "" ]]; then
    filename="$1"
else
    echo "No filename was provided. Please provide a filename before continuing..."
    exit 1
fi

#domain="a.pub.network"


echo "Copying $filename now..."

gsutil cp build/dist/prebid.js gs://a.pub.network/core/$filename

gsutil setmeta -h "Cache-Control:private" -h "Content-Type:text/html" gs://a.pub.network/core/$filename

gsutil acl ch -u AllUsers:R gs://a.pub.network/core/$filename
