# Qortex Real-time Data Submodule

## Overview

```
Module Name: Qortex RTD Provider
Module Type: RTD Provider
Maintainer: mannese@qortex.ai
```

## Description

The Qortex RTD module appends contextual segments to the bidding object based on the content of a page using the Qortex API.

Upon load, the Qortex context API will analyze the bidder page (video, text, image, etc.) and will return a [Content object](https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-API-Specification-Version-2-5-FINAL.pdf#page=26). The module will then merge that object into the appropriate bidders' `ortb2.site.content`, which can be used by prebid adapters that use `site.content` data.


## Build
```
gulp build --modules="rtdModule,qortexRtdProvider,qortexBidAdapter,..."  
```

> `rtdModule` is a required module to use Qortex RTD module.

## Configuration

Please refer to [Prebid Documentation](https://docs.prebid.org/dev-docs/publisher-api-reference/setConfig.html#setConfig-realTimeData) on RTD module configuration for details on required and optional parameters of `realTimeData`

When configuring Qortex as a data provider, refer to the template below to add the necessary information to ensure the proper connection is made.  

### RTD Module Setup

```javascript
pbjs.setConfig({
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [{
            name: 'qortex',
            waitForIt: true,
            params: {
                groupId: 'ABC123', //required
                bidders: ['qortex', 'adapter2'], //optional (see below)
                tagConfig: { // optional, please reach out to your account manager for configuration reccommendation
                    videoContainer: 'string',
                    htmlContainer: 'string',
                    attachToTop: 'string',
                    esm6Mod: 'string',
                    continuousLoad: 'string'
                }
            }
        }]
    }
});
```

### Paramter Details

#### `groupId` - Required
- The Qortex groupId linked to the publisher, this is required to make a request using this adapter

#### `bidders` - optional
- If this parameter is included, it must be an array of the strings that match the bidder code of the prebid adapters you would like this module to impact. `ortb2.site.content` will be updated *only* for adapters in this array

- If this parameter is omitted, the RTD module will default to updating  `ortb2.site.content` on *all* bid adapters being used on the page

#### `tagConfig` - optional
- This optional parameter is an object containing the config settings that could be usedto initialize the Qortex integration on your page. A preconfigured object for this step will be provided to you by the Qortex team.

- If this parameter is not present, the Qortex integration can still be configured and loaded manually on your page outside of prebid. The RTD module will continue to initialize and operate as normal.