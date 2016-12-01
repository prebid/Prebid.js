#!/bin/bash
gulp build --adapters ../washingtonian/dfp-ads/prebid-adapters-wash.json
cp build/dev/prebid.js ../washingtonian/dfp-ads/assets/js/prebid-`date +%s`.js
ls -l ../washingtonian/dfp-ads/assets/js/prebid*
