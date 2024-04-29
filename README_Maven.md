This is a fork of the [Prebid.js repository](https://github.com/prebid/Prebid.js).

Changes unique to this fork:

* This file (README\_Maven.md)
* Module configuration for the HubPages platform (hpmodules.json)
* modules/mavenDistributionAnalyticsAdapter.\* (for LiftIgniter)
* Some changes to modules/revcontentBidAdapter.js for Native ads.
* A change to src/util.js to supplement logging with timestamps.

## You can accomplish build prebid bundle and copy it to a repo with updatePrebid.js.

The script is located in this directory. Supported arguments:

    --modules=<path to modules>
    --out=<path to copy file to>

Or, you can invoke with a platform-specific argument (one of the following):

    --tempest=<path to tempest repo> (automatically does the standard tempest process)
    --tempest (with default path=../tempest-phoenix)
    --hubpages=<path to hubpages repo> (automatically does the standard hubpages process)
    --hubpages (with default path=../hubpages)
    --salish=<path to salish repo> (automatically does the standard salish process)
    --salish (with default path=..salish-sea/web-skagit)

Here are some examples of running it:

Update tempest prebid.js (both next and reg) with repo at ../tempest-phoenix

    $ node updatePrebid.js --tempest (uses default repo name)

Update hubpages prebid.js (both next and reg) with repo at ../hubpages-repo

    $ node updatePrebid.js --hubpages=../hubpages-repo (non-default name)

Update prebid.js with some modules and output it somewhere

    $ node updatePrebid.js --modules=modules.json --out=../my/lovely/path/prebid.js

## Building the HubPages Prebid Bundle

    $ gulp build --modules=hpmodules.json

You'll find the built prebid.js file in build/dist/prebid.js.

## Building the Tempest Prebid Bundle
    $ nvm use
    $ npm ci
    $ npx gulp build --modules=../tempest-phoenix/htdocs/js/prebid/modules.json --bundleName prebid.min.js
    $ npx gulp build --modules=../tempest-phoenix/htdocs/js/prebid/modules-next.json --bundleName prebid-next.min.js

You'll find the built prebid.js file in build/dist/prebid.js.

No matter how you build prebid.js and copy it to a repo, make sure the file size makes some sense!
Sanity checks go a long way.
