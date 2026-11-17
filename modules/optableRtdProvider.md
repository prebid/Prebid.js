# Optable RTD Submodule

## Overview

    Module Name: Optable RTD Provider
    Module Type: RTD Provider
    Maintainer: prebid@optable.co

## Minimal Prebid.js Versions

Prebid.js minimum version: 9.53.2+, or 10.2+

## Description

Optable RTD submodule enriches the OpenRTB request by populating `user.ext.eids` and `user.data` using an identity graph and audience segmentation service hosted by Optable on behalf of the publisher. This RTD submodule primarily relies on the Optable bundle loaded on the page, which leverages the Optable-specific Visitor ID and other PPIDs to interact with the identity graph, enriching the bid request with additional user IDs and audience data.

## Usage

### Integration

Compile the Optable RTD Module with other modules and adapters into your Prebid.js build:

```bash
gulp build --modules="rtdModule,optableRtdProvider,appnexusBidAdapter,..."
```

> Note that Optable RTD module is dependent on the global real-time data module, `rtdModule`.

### Preloading Optable SDK bundle

In order to use the module you first need to register with Optable and obtain a bundle URL. The bundle URL may be specified as a `bundleUrl` parameter to the script, or otherwise it can be added directly to the page source as:

```html
<script async src="<bundleURL>"></script>
```

### Configuration

This module is configured as part of the `realTimeData.dataProviders`.

```javascript
pbjs.setConfig({
  debug: true, // we recommend turning this on for testing as it adds more logging
  realTimeData: {
    dataProviders: [
      {
        name: 'optable',
        params: {
          adserverTargeting: true, // optional, true by default, set to true to also set GAM targeting keywords to ad slots
          instance: 'instance', // optional, name of the SDK instance on window.optable, defaults to 'instance' (window.optable.instance)
        },
      },
    ],
  },
});
```

### Parameters

| Name                     | Type     | Description                                                                                                                                                                                                                                                     | Default                    | Notes    |
|--------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------|----------|
| name                     | String   | Real time data module name                                                                                                                                                                                                                                      | Always `optable`           |          |
| params                   | Object   |                                                                                                                                                                                                                                                                 |                            |          |
| params.adserverTargeting | Boolean  | If set to `true`, targeting keywords will be passed to the ad server upon auction completion                                                                                                                                                                    | `true`                     | Optional |
| params.instance          | String   | Name of the Optable SDK instance on `window.optable`. The module uses `window.optable[instance]` to tell whether the bundle has loaded and to read targeting data. Set it when the page names its SDK instance something other than `instance`.                 | `'instance'`               | Optional |
| params.handleRtd         | Function | An optional function that uses Optable data to enrich `reqBidsConfigObj` with the real-time data. If not provided, the module uses its default handler (see [Default handler](#default-handler)). A custom function is called as soon as the auction starts, whether or not the Optable bundle has loaded (see [Publisher Customized RTD Handler Function](#publisher-customized-rtd-handler-function)). The function signature is `[async] (reqBidsConfigObj, optableExtraData, mergeFn, instance) => {}`, where `instance` is `params.instance` (or `null` when not set) | `null`                     | Optional |

## Default handler

When `handleRtd` is not provided, the module enriches each auction as soon as it starts:

1. If the Optable bundle has loaded and exposes `window.optable.rtd.handleRtd`, the module calls it. Bundles can
   override that function to change how data is merged. The bundle counts as loaded when it exposes that function or
   when the SDK instance named by `params.instance` exists on `window.optable`.
2. If the bundle has not loaded yet, the module merges the targeting data the bundle cached on a previous page
   (`localStorage` key `OPTABLE_RESOLVED`, read through Prebid's storage manager), without waiting. Cached EIDs are
   added to `user.ext.eids`.
3. If nothing is cached, the module waits for the bundle to load (up to `auctionDelay` when `waitForIt` is `true`),
   then continues as in step 1.

Most publishers should not need a custom `handleRtd`.

## Publisher Customized RTD Handler Function

When there is more pre-processing or post-processing needed prior/post calling Optable bundle - a custom `handleRtd`
function can be supplied to do that.
This function will also be responsible for the `reqBidsConfigObj` enrichment.
The module calls it as soon as the auction starts, so the Optable bundle may not have loaded yet. A handler that needs
the bundle should wait for it first:

```javascript
await new Promise((resolve) => {
  window.optable = window.optable || { cmd: [] };
  window.optable.cmd.push(resolve);
});
```

The module waits for the handler to finish: if it returns a promise (for example an `async` function), the auction
waits for that promise to settle, within the RTD `auctionDelay`.
It will also receive the `optableExtraData` object, which can contain the extra data required for the enrichment and
shouldn't be shared with other RTD providers/bidders.
`mergeFn` parameter taken by `handleRtd` is a standard Prebid.js utility function that take an object to be enriched and
an object to enrich with: the second object's fields will be merged into the first one (also see the code of an example
mentioned below):

```javascript
mergeFn(
  reqBidsConfigObj.ortb2Fragments.global, // or other nested object as needed
  rtdData,
);
```

A `handleRtd` function implementation has access to its surrounding context including capturing a `pbjs` object, calling `pbjs.getConfig()` and f.e. reading off the `consentManagement` config to make the appropriate decision based on it.

## Targeting Mode (`enableTargeting`)

With `params.enableTargeting: true` the module fetches targeting itself instead of handing off to the Optable bundle:

1. If the Optable Web SDK instance (`window.optable[instance]`) is on the page, it waits for the SDK's `optable-targeting:change` event (up to `auctionDelay`), or uses the SDK's cached targeting.
2. Otherwise, if `host`, `node` and `site` are set, it calls the DCN targeting API (`https://<host>/v2/targeting`) directly. This covers pages without the Optable bundle and pages where the bundle loads after the auction starts.
3. Otherwise, when none of `host`, `node` and `site` is set, it relies on the Web SDK loading later: like the [default handler](#default-handler), it uses the targeting cached under `OPTABLE_RESOLVED` (EIDs or a split test assignment), or waits for the SDK when nothing usable is cached, then continues as in step 1.

When the auction is not delayed (`auctionDelay` unset or 0), the module does not wait for the SDK's event.

`bundleUrl` and `optableRtdConfig` are ignored in this mode.

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 200,
    dataProviders: [
      {
        name: 'optable',
        waitForIt: true,
        params: {
          enableTargeting: true,
          host: 'dcn.customer.com',
          node: 'prod-us',
          site: 'my-site',
          ids: ['e:<sha256>', 'c:<ppid>'], // optional
          cookies: true,                   // optional
          skipMergeIfUid2Exists: false,    // optional
        },
      },
    ],
  },
});
```

### Parameters

| Name                         | Type     | Description                                                                                                       | Default            |
|------------------------------|----------|-------------------------------------------------------------------------------------------------------------------|--------------------|
| params.enableTargeting       | Boolean  | Enables targeting mode                                                                                            | `false`            |
| params.host                  | String   | DCN hostname. Required for direct API calls                                                                       | None               |
| params.node                  | String   | DCN node identifier. Required for direct API calls                                                                | None               |
| params.site                  | String   | Site slug configured on the DCN. Required for direct API calls                                                    | None               |
| params.cookies               | Boolean  | When `false`, the visitor passport is sent as a query parameter instead of relying on cookies                     | `true`             |
| params.timeout               | String/Number | Targeting API timeout as a duration, e.g. `"500ms"`, or a number of milliseconds. Defaults to `auctionDelay` minus 100ms when the auction is delayed | `null`  |
| params.ids                   | Array    | Optable identifiers, e.g. `"e:<sha256>"`, `"c:<ppid>"`. Prebid userId EIDs are not used                           | `["__passport__"]` |
| params.hids                  | Array    | Hint identifiers                                                                                                  | `[]`               |
| params.skipMergeIfUid2Exists | Boolean  | Skip Optable's UID2 EIDs when `ortb2Fragments.global.user.ext.eids` already has one                               | `false`            |
| params.instance              | String   | Web SDK instance name on `window.optable`                                                                         | `'instance'`       |
| params.optableCacheTargeting | String   | localStorage key of the targeting cache, the Web SDK's `optableCacheTargeting`                                    | `'OPTABLE_RESOLVED'` |
| params.handleRtd             | Function | Custom handler: `[async] (reqBidsConfigObj, targetingData, mergeFn, options) => {}`. `options` carries `skipMergeIfUid2Exists`. `targetingData` may have no `ortb2`, e.g. a split test assignment only | `null` |

### Behaviour

- **Enrichment:** EIDs are merged into `ortb2Fragments.global.user.ext.eids`, subject to Prebid's `enrichEids` activity controls. Each ad unit gets `ortb2Imp.ext.optable.variant`, and `ortb2Imp.ext.optable.splitTestAssignment` when the DCN returns `split_test_assignment`.
- **Caching:** Direct API responses are cached in localStorage under `OPTABLE_RESOLVED` (or `optableCacheTargeting`), the key Optable bundles and the Web SDK's Prebid helper use, which the module reads back, and under the Web SDK's `OPTABLE_TARGETING_*` key so the SDK's `targetingFromCache()` can use them. A cached response is used immediately and refreshed in the background once per page load; concurrent auctions share one API call. A successful response replaces the cache, even when empty; a failed call leaves it untouched. On a page where the Optable bundle loads after the auction starts, this replaces the merged cache the bundle wrote on a previous page (tokenize carryover, `_id5`) for that page; the bundle rebuilds it when it runs. Without a cache, the auction waits for the API call, and a response arriving after `auctionDelay` is cached for the next auction instead of merged.
- **UID2 refresh data:** `ext.optable.ref` pointers are stripped from EIDs before they reach bid requests, and `refs` are stored keyed by EID source, matching the Web SDK cache format.
- **Passport:** Stored under the Web SDK's `OPTABLE_PASSPORT_*` key, and removed from the response before merging.
- **Split tests:** `splitTestAssignment` comes from the DCN's `split_test_assignment` (`test` or `production`). The DCN enforces its holdout by returning no EIDs to `test` visitors, so direct mode uses the DCN split; the Web SDK's client-side `setupAB` (`OPTABLE_SPLIT_TEST`) is not read.
- **Consent:** GPP and TCF strings come from Prebid's consent modules. When GDPR applies, credentials are only sent when TCF Purpose 1 is granted. The module has no GVL ID, so when the `tcfControl` module enforces GDPR, Prebid blocks its storage, credentials and EID enrichment unless `optable` is listed in the `softVendorExceptions` of the `storage` rule. Purpose 1 consent is still required:

  ```javascript
  pbjs.setConfig({
    consentManagement: {
      gdpr: {
        rules: [{ purpose: 'storage', enforcePurpose: true, enforceVendor: true, softVendorExceptions: ['optable'] }],
      },
    },
  });
  ```

- **Ad server targeting:** `adserverTargeting` still requires the Web SDK on the page.

## Example

If you want to see an example of how the optable RTD module works, run the following command:

```bash
gulp serve --modules=optableRtdProvider,consentManagementGpp,consentManagementTcf,appnexusBidAdapter
```

and then open the following URL in your browser:

[`http://localhost:9999/integrationExamples/gpt/optableRtdProvider_example.html`](http://localhost:9999/integrationExamples/gpt/optableRtdProvider_example.html)

Open the browser console to see the logs.

## Maintainer contacts

Any suggestions or questions can be directed to [prebid@optable.co](mailto:prebid@optable.co).

Alternatively please open a new [issue](https://github.com/prebid/prebid-server-java/issues/new) or [pull request](https://github.com/prebid/prebid-server-java/pulls) in this repository.
