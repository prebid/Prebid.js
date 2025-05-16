# Optable RTD Submodule

## Overview

    Module Name: Optable RTD Provider
    Module Type: RTD Provider
    Maintainer: prebid@optable.co

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

In order to use the module you first need to load the Optable SDK in your page. You can do this by adding the following script tag to your page where `<bundleURL>` as been provided by Optable. The `instanceName` is optional and defaults to `prebid_instance` if not provided.

```html
<script async src="<bundleURL>"></script>
```

### Configuration

This module is configured as part of the `realTimeData.dataProviders`. We recommend setting `auctionDelay` to 400 ms and make sure `waitForIt` is set to `true` for the `Optable` RTD provider.

```javascript
pbjs.setConfig({
  debug: true, // we recommend turning this on for testing as it adds more logging
  realTimeData: {
    auctionDelay: 400,
    dataProviders: [
      {
        name: 'optable',
        waitForIt: true, // should be true, otherwise the auctionDelay will be ignored
        params: {
          instanceName: '<optional, prebid_instance by default, name of the Optable SDK instance to use>',
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
| waitForIt                | Boolean  | Should be set `true` together with `auctionDelay` to ensure proper timing of data enrichment                                                                                                                                                                    | `false`          | Required |
| params                   | Object   | Configuration parameters for the Optable RTD provider                                                                                                                                                                                                           |                  |          |
| params.instanceName      | String   | Name of the Optable SDK instance to use                                                                                                                                                                                                                         | `"prebid_instance"`     | Optional |
| params.adserverTargeting | Boolean  | If set to `true`, targeting keywords will be passed to the ad server upon auction completion                                                                                                                                                                    | `true`           | Optional |

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
