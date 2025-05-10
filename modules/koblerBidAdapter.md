# Overview

**Module Name**: Kobler Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: bidding-support@kobler.no  

# Description

Connects to Kobler's demand sources.

This adapter currently only supports Banner Ads.

# Parameters

| Parameter (in `params`) | Scope    | Type             | Description                                                                                                                                                                                                            | Example                      |
|-------------------------|----------|------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------|
| test                    | Optional | Boolean          | Whether the request is for testing only. When multiple ad units are submitted together, it is enough to set this parameter on the first one. Enables providing a custom URL through config.pageUrl. Defaults to false. | `true`                       |
| floorPrice              | Optional | Float            | Floor price in CPM and USD. Can be used as an alternative to the [Floors module](https://docs.prebid.org/dev-docs/modules/floors.html), which is also supported by this adapter. Defaults to 0.                        | `5.0`                        |
| dealIds                 | Optional | Array of Strings | Array of deal IDs.                                                                                                                                                                                                     | `['abc328745', 'mxw243253']` |

## Implicit parameters

Kobler identifies the placement using the combination of the page URL and the allowed sizes. As a result, it's important that the correct sizes are provided in `banner.sizes` in order for Kobler to correctly identify the placement. The main, desired format should be the first element of this array.

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
      bidder: 'kobler'
    }]
  }];
```

In order to see a sample bid from Kobler (without a proper setup), you have to also do the following:
- Set the `test` parameter to `true`.
- Set `config.pageUrl` to `'https://www.tv2.no/mening-og-analyse/14555348/'`. This is necessary because Kobler only bids on recognized articles. Kobler runs its own test campaign to make sure there is always a bid for this specific page URL.

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
        test: true,
        floorPrice: 5.0,
        dealIds: ['abc328745', 'mxw243253']
      }
    }]
  }];
```
