# Guardian-specific modifications

These are the ways in which the Guardian optimised build differs from the [generic Prebid](https://github.com/prebid/Prebid.js) build:

## General

Changes in files are wrapped between `/* gu-mod-start */` and `/* gu-mod-end */` comments,
to make it easier when upgrading versions. `CODEOWNERS` also highlights which files
are actually created or modified by the @guardian/commercial-dev team.

To compare this repo with upstream, see https://github.com/prebid/Prebid.js/compare/master...guardian:master

Building `build/dist/prebid.js` is achieved by running the following `gulp` command:

```sh
gulp build
```

- Ad server targeting includes a `hb_ttr` parameter, whose value will be one of:
  - the time to respond for the winning bid in ms (ie. time between bid request sent and bid response received)
  - -1 if the auction timed out without a winning bid and still waiting for at least one bid response
  - otherwise not passed at all

## Bid adapters

- The [Sonobi adapter](/modules/sonobiBidAdapter.js):
  - has an extra request parameter, `gmgt`, holding AppNexus targeting key-values
  - has a customised `pv` parameter, holding the Ophan-generated pageview ID
- The [AppNexus adapter](/modules/appnexusBidAdapter.js) has an alias `xhb` for Xaxis, an alias `and` for AppNexus direct and an alias `pangaea` for Pangaea.
- The [OpenX adapter](/modules/openxBidAdapter.js) has an alias `oxd` for OpenX direct, instead of via server-side header bidding.

## Analytics adapters

- We have built two analytics adapters:
  - an [adapter](/modules/guAnalyticsAdapter.js) to send analytics to the data lake
  - a simple console-logging [adapter](/modules/consoleLoggingAnalyticsAdapter.js)

## How to Upgrade

1. Ensure you are running the version of node specified in `.nvmrc`

   > node -v

1. Make sure you have the latest commits to `guardian/Prebid.js`:

   > git pull

1. Check your remotes to see if you have upstream:
   > git remote -v
1. If not add upstream to your remotes:
   > git remote add upstream git@github.com:prebid/Prebid.js.git
1. Fetch all from upstream:
   > git fetch --all
1. Checkout a new branch e.g.:
   > git checkout -b upgrade-v6.26.0
1. You should now have all the release tags and you can merge a tag e.g.:
   > git merge 6.26.0
1. Regenerate the `package-lock.json` file
   ```sh
   rm package-lock.json
   rm -rf ./node_modules
   npm install
   ```
1. Resolve any conflicts
1. Ensure the package.json name field is `@guardian/prebid.js`
1. If this upgrade diverges from the upstream prebid.js version (i.e. a Guardian specific change) add a suffix to the package.json version field e.g. 8.34.0-1
1. Create new build
   > npm run build
1. Commit and ensure `build/dist/prebid.js` is included

### Troubleshooting

If you get the following error when trying to run `npm install`:

> Node gyp ERR - invalid mode: 'rU' while trying to load binding.gyp

it is due to a bug between node-gyp and Python >=v3.11. This stackoverflow answer is a quick fix around the issue:

https://stackoverflow.com/a/75260066
