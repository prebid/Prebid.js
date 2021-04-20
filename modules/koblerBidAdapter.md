# Overview

**Module Name**: Kobler Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: bidding-support@kobler.no  

# Description

Connects to Kobler's demand sources.

This adapter currently only supports Banner Ads.

# Parameters

| Parameter (in `params`) | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| placementId | Required | String | The identifier of the placement, it has to be issued by Kobler. | `'xjer0ch8'` |
| zip | Optional | String | Zip code of the user or the medium. When multiple ad units are submitted together, it is enough to set this parameter on the first one. | `'102 22'` |
| test | Optional | Boolean | Whether the request is for testing only. When multiple ad units are submitted together, it is enough to set this parameter on the first one. Defaults to false. | `true` |
| floorPrice | Optional | Float | Floor price in CPM and USD. Can be used as an alternative to the [Floors module](https://docs.prebid.org/dev-docs/modules/floors.html), which is also supported by this adapter. Defaults to 0. | `5.0` |
| position | Optional | Integer | The position of the ad unit. Can be used to differentiate between ad units if the same placement ID is used across multiple ad units. The first ad unit should have a `position` of 0, the second one should have a `position` of 1 and so on. Defaults to 0. | `1` |
| dealIds | Optional | Array of Strings | Array of deal IDs. | `['abc328745', 'mxw243253']` |

# Test Parameters
```javascript
  const adUnits = [{
    code: 'div-gpt-ad-1460505748561-1',
    mediaTypes: {
        banner: {
            sizes: [[320, 250], [300, 250]],
        }
    },
    bids: [{
      bidder: 'kobler',
      params: {
        placementId: 'k5H7et3R0'
      }
    }]
  }];
```

In order to see a sample bid from Kobler (without a proper setup), you have to also do the following:
- Change the [`refererInfo` function](https://github.com/prebid/Prebid.js/blob/master/src/refererDetection.js) to return `'https://www.tv2.no/a/11734615'` as a [`referer`](https://github.com/prebid/Prebid.js/blob/caead3ccccc448e4cd09d074fd9f8833f56fe9b3/src/refererDetection.js#L169). This is necessary because Kobler only bids on recognized articles. 
- Change the adapter's [`BIDDER_ENDPOINT`](https://github.com/prebid/Prebid.js/blob/master/modules/koblerBidAdapter.js#L8) to `'https://bid-service.dev.essrtb.com/bid/prebid_rtb_call'`. This endpoint belongs to the development server that is set up to always return a bid for the correct `placementId` and page URL combination. 

# Test Optional Parameters
```javascript
  const adUnits = [{
    code: 'div-gpt-ad-1460505748561-1',
    mediaTypes: {
        banner: {
            sizes: [[320, 250], [300, 250]],
        }
    },
    bids: [{
      bidder: 'kobler',
      params: {
        placementId: 'k5H7et3R0',
        zip: '102 22',
        test: true,
        floorPrice: 5.0,
        position: 1,
        dealIds: ['abc328745', 'mxw243253']
      }
    }]
  }];
```
