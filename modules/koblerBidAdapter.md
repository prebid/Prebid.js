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
| bidfloor | Optional | Float | Floor price in CPM and in the currency given in currency.adServerCurrency. Can be used as an alternative to the [Floors module](https://docs.prebid.org/dev-docs/modules/floors.html), which is also supported by this adapter. Defaults to 0. | `5.0` |
| floorprice | Optional | Float | Same as bidfloor. | `5.0` |
| position | Optional | Integer | The position of the ad unit. Can be used to differentiate between ad units if the same placement ID is used across multiple ad units. Defaults to 0. | `1` |
| dealId | Optional | String | Deal ID. | `'abc328745'` |

# Test Parameters
```javascript
  const adUnits = [{
    code: 'div-gpt-ad-1460505748561-1',
    mediaTypes: {
        banner: {
            sizes: [[300, 250], [300, 600]],
        }
    },
    bids: [{
      bidder: 'kobler',
      params: {
        placementId: 'xjer0ch8'
      }
    }]
  }];
```

# Test Optional Parameters
```javascript
  const adUnits = [{
    code: 'div-gpt-ad-1460505748561-1',
    mediaTypes: {
        banner: {
            sizes: [[300, 250], [300, 600]],
        }
    },
    bids: [{
      bidder: 'kobler',
      params: {
        placementId: 'xjer0ch8',
        zip: '102 22',
        test: true,
        bidfloor: 5.0,
        position: 1,
        dealId: 'abc328745'
      }
    }]
  }];
```
