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
          adserverTargeting: '<optional, true by default, set to true to also set GAM targeting keywords to ad slots>',
        },
      },
    ],
  },
});
```

### Parameters

| Name                     | Type     | Description                                                                                                                                                                                                                                                     | Default          | Notes    |
|--------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------|----------|
| name                     | String   | Real time data module name                                                                                                                                                                                                                                      | Always `optable` |          |
| params                   | Object   |                                                                                                                                                                                                                                                                 |                  |          |
| params.adserverTargeting | Boolean  | If set to `true`, targeting keywords will be passed to the ad server upon auction completion                                                                                                                                                                    | `true`           | Optional |
| params.handleRtd         | Function | An optional function that uses Optable data to enrich `reqBidsConfigObj` with the real-time data. If not provided, the module will do a default call to Optable bundle. The function signature is `[async] (reqBidsConfigObj, optableExtraData, mergeFn) => {}` | `null`           | Optional |

## Publisher Customized RTD Handler Function

When there is more pre-processing or post-processing needed prior/post calling Optable bundle - a custom `handleRtd`
function can be supplied to do that.
This function will also be responsible for the `reqBidsConfigObj` enrichment.
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
