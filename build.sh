#!/bin/sh
gulp webpack
gulp bundle --modules=modules.json
cp build/dist/prebid.js ~/dev/pubfig.js/build/dist/
