# Overview

```text
Module Name:  AdSpirit Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   prebid@adspirit.de
```

# Description

Connects Prebid.js to the AdSpirit exchange for banner and native bids.

The module registers the bidder codes `adspirit` and `twiago`.

- For `adspirit`, both `placementId` and `host` are required.
- For `twiago`, `placementId` is required and the adapter uses `a.twiago.com`
  as the host.

## Supported features

1. Banner media type
2. Native media type using OpenRTB Native 1.2
3. Banner/native multi-format ad units
4. SupplyChain Object forwarding from `ortb2.source.ext.schain`
5. User ID EIDs from `userIdAsEids`
6. Advertiser domains in bid-response metadata
7. TCF-EU/GDPR consent forwarding when consent data is supplied by Prebid.js

## Bid parameters

| Name | Scope | Description | Example | Type |
| --- | --- | --- | --- | --- |
| `placementId` | required | AdSpirit placement ID | `'99'` | `string` |
| `host` | required for `adspirit` | AdSpirit host provided for the account. It is not required for the `twiago` alias. | `'test.adspirit.de'` | `string` |
| `bidfloor` | optional | Minimum bid price. The adapter sends the value in EUR. | `0.10` | `number` or numeric `string` |
| `siteId` | optional | OpenRTB `site.id` value | `'site-123'` | `string` |
| `publisherId` | optional | OpenRTB `site.publisher.id` value | `'publisher-123'` | `string` |
| `publisherName` | optional | OpenRTB `site.publisher.name` value | `'Example Publisher'` | `string` |

## Banner example

```javascript
const adUnits = [
  {
    code: 'display-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
        bidder: 'adspirit',
        params: {
          placementId: '7',
          host: 'test.adspirit.de'
        }
      }
    ]
  }
];
```

## Native example

Native assets must be defined directly under `mediaTypes.native.ortb.assets`.
Do not place them inside an additional `request` object. Prebid.js normalizes
the accepted configuration into `nativeOrtbRequest`, which the adapter uses to
build the OpenRTB Native request.

```javascript
const adUnits = [
  {
    code: 'native-div',
    mediaTypes: {
      native: {
        ortb: {
          ver: '1.2',
          assets: [
            {
              id: 1,
              required: 1,
              title: {
                len: 100
              }
            },
            {
              id: 2,
              required: 1,
              img: {
                type: 3,
                wmin: 1200,
                hmin: 627,
                mimes: [
                  'image/png',
                  'image/gif',
                  'image/jpeg'
                ]
              }
            },
            {
              id: 4,
              required: 1,
              data: {
                type: 2,
                len: 150
              }
            },
            {
              id: 3,
              required: 0,
              data: {
                type: 12,
                len: 50
              }
            },
            {
              id: 6,
              required: 0,
              data: {
                type: 1,
                len: 50
              }
            },
            {
              id: 5,
              required: 0,
              img: {
                type: 1,
                wmin: 50,
                hmin: 50,
                mimes: [
                  'image/png',
                  'image/gif',
                  'image/jpeg'
                ]
              }
            }
          ]
        }
      }
    },
    bids: [
      {
        bidder: 'adspirit',
        params: {
          placementId: '99',
          host: 'test.adspirit.de',
          bidfloor: 0.10
        }
      }
    ]
  }
];
```

## Native asset overview

The asset IDs in the example are conventions used by this configuration:

1. **Title (`id: 1`)** — requested as mandatory with a maximum length of
   100 characters.
2. **Main image (`id: 2`)** — requested as mandatory, using image type `3`.
3. **Body text (`id: 4`)** — requested as mandatory with a maximum length of
   150 characters.
4. **Call to action (`id: 3`)** — requested as optional using data type `12`.
5. **Sponsored by (`id: 6`)** — requested as optional using data type `1`.
6. **Icon (`id: 5`)** — requested as optional using image type `1`.

The adapter does not enforce a fixed mandatory set of native assets. Whether an
asset is mandatory is controlled by the `required` value in the publisher's
native request.

The click URL is returned by the bidder in `native.link.url`; it is not a
request asset. The adapter also retains the complete OpenRTB Native response,
including response event trackers, in the native ORTB response object.

## Privacy

When Prebid.js supplies `gdprConsent`, the adapter forwards `gdprApplies` and
the consent string in both the request URL and the OpenRTB request.

Using the adapter does not by itself guarantee legal compliance. Publishers are
responsible for their consent configuration and applicable legal requirements.

- [AdSpirit privacy information](https://support.adspirit.de/hc/en-us/categories/115000453312-General)
- [IAB Europe CMP list](https://iabeurope.eu/cmp-list/)
- [AdSpirit list of functions that require consent](https://support.adspirit.de/hc/en-us/articles/360014631659-List-of-functions-that-require-consent)
