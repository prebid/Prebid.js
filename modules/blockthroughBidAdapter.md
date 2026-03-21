# Overview

**Module Name**: BT Bidder Adapter
**Module Type**: Bidder Adapter  
**Maintainer**: engsupport@blockthrough.com

# Description

The BT Bidder Adapter provides an interface to the BT Service. The BT Bidder Adapter sends one request to the BT Service per ad unit. Behind the scenes, the BT Service further disperses requests to various configured exchanges. This operational model closely resembles that of Prebid Server, where a single request is made from the client side, and responses are gathered from multiple exchanges.

The BT adapter requires setup and approval from the Blockthrough team. Please reach out to marketing@blockthrough.com for more information.

# Bid Params

| Key    | Scope    | Type   | Description                                                    |
| ------ | -------- | ------ | -------------------------------------------------------------- |
| bidder | Required | Object | Bidder configuration. Could configure several bidders this way |

# Bidder Config

Make sure to set required ab, orgID, websiteID values received after approval using `pbjs.setBidderConfig`.

## Example

```javascript
pbjs.setBidderConfig({
  bidders: ['blockthrough'],
  config: {
    ortb2: {
      site: {
        ext: {
          blockthrough: {
            ab: false,
            orgID: '4829301576428910',
            websiteID: '5654012389765432',
          },
        },
      },
    },
  },
});
```

## AdUnits configuration example

```javascript
var adUnits = [
  {
    code: 'banner-div-1',
    mediaTypes: {
      banner: {
        sizes: [[728, 90]],
      },
    },
    bids: [
      {
        bidder: 'blockthrough',
        params: {
          bidderA: {
            publisherId: 55555,
          },
          bidderB: {
            zoneId: 12,
          },
        },
      },
    ],
  },
];
```
