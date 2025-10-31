# Overview

Module Name: Gamera Rtd Provider
Module Type: Rtd Provider
Maintainer: aleksa@gamera.ai

# Description

RTD provider for Gamera.ai that enriches bid requests with real-time data, by populating the [First Party Data](https://docs.prebid.org/features/firstPartyData.html) attributes.
The module integrates with Gamera's AI-powered audience segmentation system to provide enhanced bidding capabilities.
The Gamera RTD Provider works in conjunction with the Gamera script, which must be available on the page for the module to enrich bid requests. To learn more about the Gamera script, please visit the [Gamera website](https://gamera.ai/).

ORTB2 enrichments that gameraRtdProvider can provide:
 * `ortb2.site`
 * `ortb2.user`
 * `AdUnit.ortb2Imp`

# Integration

## Build

Include the Gamera RTD module in your Prebid.js build:

```bash
gulp build --modules=rtdModule,gameraRtdProvider
```

## Configuration

Configure the module in your Prebid.js configuration:

```javascript
pbjs.setConfig({
    realTimeData: {
        dataProviders: [{
            name: 'gamera',
            params: {
                // Optional configuration parameters
            }
        }]
    }
});
```

### Configuration Parameters

The module currently supports basic initialization without required parameters. Future versions may include additional configuration options.

## Support

For more information or support, please contact gareth@gamera.ai.
