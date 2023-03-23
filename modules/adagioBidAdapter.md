# Overview

Module Name: Adagio Bid Adapter
Module Type: Adagio Adapter
Maintainer: dev@adagio.io

## Description

Connects to Adagio demand source to fetch bids.

## Configuration

### User Sync

Add the following code to enable user sync. Adagio strongly recommends enabling user syncing through iframes. This functionality improves DSP user match rates and increases the  bid rate and bid price. Be sure to call `pbjs.setConfig()` only once.

```javascript
pbjs.setConfig({
  userSync: {
    iframeEnabled: true,
    filterSettings: {
      iframe: {
        bidders: ['adagio'],
        filter: 'include'
      }
    }
  }
});
```

### Bidder Settings

The Adagio bid adapter uses browser local storage. Since Prebid.js 7.x, the access to it must be explicitly set.

```js
// https://docs.prebid.org/dev-docs/publisher-api-reference/bidderSettings.html
pbjs.bidderSettings = {
  adagio: {
    storageAllowed: true
  }
}
```

### Params configuration

Adagio require several params. These params must be set at Prebid.js BidderConfig config level or at adUnit level.

Below, the list of Adagio params and where they can be set.

| Param name                     | Global config | AdUnit config |
| ------------------------------ | ------------- | ------------- |
| siteId                         | x             |               |
| organizationId *               |               | x             |
| site *                         |               | x             |
| pagetype                       | x             | x             |
| category                       | x             | x             |
| useAdUnitCodeAsAdUnitElementId | x             | x             |
| useAdUnitCodeAsPlacement       | x             | x             |
| placement                      |               | x             |
| adUnitElementId                |               | x             |
| debug                          |               | x             |
| video                          |               | x             |
| native                         |               | x             |
| splitKeyword                   |               | x             |
| dataLayer                      |               | x             |

_* These params are deprecated in favor the Global configuration setup, see below._

#### Global Adagio configuration

The global Adagio configuration is used to store params once instead of duplicate them to each adUnit. The values will be used as "params" in the ad-request. Be sure to call `pbjs.setConfig()` only once.

```javascript
pbjs.setConfig({
  debug: false,
  // …,
  adagio: {
    siteId: '1002:adagio-io', // Required. Provided by Adagio

    // The following params are limited to 30 characters,
    // and can only contain the following characters:
    // - alphanumeric (A-Z+a-z+0-9, case-insensitive)
    // - dashes `-`
    // - underscores `_`
    // Also, each param can have at most 50 unique active values (case-insensitive).
    pagetype: 'article', // Highly recommended. The pagetype describes what kind of content will be present in the page.
    category: 'sport', // Recommended. Category of the content displayed in the page.
    useAdUnitCodeAsAdUnitElementId: false, // Optional. Use it by-pass adUnitElementId and use the adUnit code as value
    useAdUnitCodeAsPlacement: false, // Optional. Use it to by-pass placement and use the adUnit code as value
  }
});
```

#### Ad-unit configuration
```javascript
var adUnits = [
  {
    code: 'dfp_banniere_atf',
    bids: [{
      bidder: 'adagio',
      params: {
        placement: 'in_article', // Required. Refers to the placement of an adunit in a page. Must not contain any information about the type of device. Other example: `mpu_btf'.
        adUnitElementId: 'article_outstream', // Required - AdUnit element id. Refers to the adunit id in a page. Usually equals to the adunit code above.
        // Optional debug mode, used to get a bid response with expected cpm.
        debug: {
          enabled: true,
          cpm: 3.00 // default to 1.00
        },
        video: {
          api: [2, 7], // Required - Your video player must at least support the value 2 and/or 7.
          playbackMethod: [6], // Highly recommended
          skip: 0
          // OpenRTB video options defined here override ones defined in mediaTypes.
        },
        native: {
          // Optional OpenRTB Native 1.2 request object. Only `context`, `plcmttype` fields are supported.
          context: 1,
          plcmttype: 2
        },
        splitKeyword: 'splitrule-one',
        dl: {
          placement: '1234'
        }
      }
    }]
  }
];
```

#### Note on FPD support

Adagio will use FPD data as fallback for the params below:
- pagetype
- category

If the FPD value is an array, the 1st value of this array will be used.

## Test Parameters

```javascript

  pbjs.setConfig({
    debug: true,
    adagio: {
      pagetype: 'article',
      category: 'sport',
      useAdUnitCodeAsAdUnitElementId: false,
      useAdUnitCodeAsPlacement: false,
    },
    userSync: {
      filterSettings: {
        iframe: {
          bidders: ['adagio'],
          filter: 'include'
        }
      }
    }
  });

  var adUnits = [
    {
      code: 'dfp_banniere_atf',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]],
        }
      },
      bids: [{
        bidder: 'adagio', // Required
        params: {
          placement: 'in_article',
          adUnitElementId: 'article_outstream',
          debug: {
            enabled: true,
            cpm: 3.00 // default to 1.00
          }
        }
      }]
    },
    {
      code: 'article_outstream',
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [640, 480],
          mimes: ['video/mp4'],
          skip: 1
        }
      },
      bids: [{
        bidder: 'adagio',
        params: {
          placement: 'in_article',
          adUnitElementId: 'article_outstream',
          video: {
            skip: 0
          },
          debug: {
            enabled: true,
            cpm: 3.00
          }
        }
      }]
    },
    {
      code: 'article_native',
      mediaTypes: {
        native: {
          // generic Prebid options
          title: {
              required: true,
              len: 80
          },
          // …
          // Custom Adagio data assets
          ext: {
            adagio_bvw: {
              required: false
            }
          }
        }
      },
      bids: [{
        bidder: 'adagio',
        params: {
          placement: 'in_article',
          adUnitElementId: 'article_native',
          native: {
            context: 1,
            plcmttype: 2
          },
          debug: {
            enabled: true,
            cpm: 3.00
          }
        }
      }]
    }
  ];

  pbjs.addAdUnits(adUnits);

  pbjs.bidderSettings = {
    adagio: {
      alwaysUseBid: true,
      adserverTargeting: [
        {
          key: "site",
          val: function (bidResponse) {
            return bidResponse.site;
          }
        },
        {
          key: "placement",
          val: function (bidResponse) {
            return bidResponse.placement;
          }
        },
        {
          key: "pagetype",
          val: function (bidResponse) {
            return bidResponse.pagetype;
          }
        },
        {
          key: "category",
          val: function (bidResponse) {
            return bidResponse.category;
          }
        }
      ]
    }
  }
```
