This is a fork of the [Prebid.js repository](https://github.com/prebid/Prebid.js).

Changes unique to this fork:

* This file (README\_Maven.md)
* Module configuration for the Salish platform (modules.json)
* Module configuration for the HubPages platform (hpmodules.json)
* The Sublime bid adapter module (modules/sublimeBidAdapter.js)
  and tests (test/spec/modules/sublimeBidAdapter\_spec.js)


## Building the Salish Prebid Bundle

Follow the README.md instructions for setting up this repository, then use this
command to build the bundle:

    $ gulp build --modules=modules.json

You'll find the built prebid.js file in build/dist/prebid.js.


## Building the HubPages Prebid Bundle

    $ gulp build --modules=hpmodules.json

You'll find the built prebid.js file in build/dist/prebid.js.

