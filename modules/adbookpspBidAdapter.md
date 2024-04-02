### Overview

```
Module Name: AdbookPSP Bid Adapter
Module Type: Bidder Adapter
Maintainer: hbsupport@fattail.com
```

### Description

Prebid.JS adapter that connects to the AdbookPSP demand sources.

*NOTE*: The AdBookPSP Bidder Adapter requires setup and approval before use. The adapter uses custom targeting keys that require a dedicated Google Ad Manager setup to work. Please reach out to your AdbookPSP representative for more details. 

### Bidder parameters

Each adUnit with `adbookpsp` adapter has to have either `placementId` or `orgId` set.

```js
var adUnits = [
  {
    bids: [
      {
        bidder: 'adbookpsp',
        params: {
          placementId: 'example-placement-id',
          orgId: 'example-org-id',
        },
      },
    ],
  },
];
```

Alternatively, `orgId` can be set globally while configuring prebid.js:

```js
pbjs.setConfig({
  adbookpsp: {
    orgId: 'example-org-id',
  },
});
```

*NOTE*: adUnit orgId will take precedence over the globally set orgId.

#### Banner parameters

Required:

- sizes

Example configuration:

```js
var adUnits = [
  {
    code: 'div-1',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    }
  },
];
```

#### Video parameters

Required:

- context
- mimes
- playerSize

Additionaly, all `Video` object parameters described in chapter `3.2.7` of the [OpenRTB 2.5 specification](https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-API-Specification-Version-2-5-FINAL.pdf) can be passed as bidder params.

Example configuration:

```js
var adUnits = [
  {
    code: 'div-1',
    mediaTypes: {
      video: {
        context: 'outstream',
        mimes: ['video/mp4', 'video/x-flv'],
        playerSize: [400, 300],
        protocols: [2, 3],
      },
    },
    bids: [
      {
        bidder: 'adbookpsp',
        params: {
          placementId: 'example-placement-id',
          video: {
            placement: 2,
          },
        },
      },
    ],
  },
];
```

*NOTE*: Supporting outstream video requires the publisher to set up a renderer as described [in the Prebid docs](https://docs.prebid.org/dev-docs/show-outstream-video-ads.html).

#### Testing params

To test the adapter, either `placementId: 'example-placement-id'` or `orgId: 'example-org-id'` can be used. 

*NOTE*: If any adUnit uses the testing params, all adUnits will receive testing responses.

Example adUnit configuration:

```js
var adUnits = [
  {
    code: 'div-1',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    bids: [
      {
        bidder: 'adbookpsp',
        params: {
          placementId: 'example-placement-id',
        },
      },
    ],
  },
];
```

Example google publisher tag configuration:

```js
googletag
  .defineSlot('/22094606581/example-adbookPSP', sizes, 'div-1')
  .addService(googletag.pubads());
```

### Configuration

Setting of the `orgId` can be done in the `pbjs.setConfig()` call. If this is the case, both `orgId` and `placementId` become optional. Remember to only call `pbjs.setConfig()` once as each call overwrites anything set in previous calls.

Enabling iframe based user syncs is also encouraged.

```javascript
pbjs.setConfig({
  adbookpsp: {
    orgId: 'example-org-id',
    winTrackingEnabled: true,
  },
  userSync: {
    filterSettings: {
      iframe: {
        bidders: '*',
        filter: 'include',
      },
    },
  },
});
```

### Privacy

GDPR and US Privacy are both supported by default.

#### Event tracking

This adapter tracks win events for it’s bids. This functionality can be disabled by adding `winTrackingEnabled: false` to the adapter configuration:

```js
pbjs.setConfig({
  adbookpsp: {
    winTrackingEnabled: false,
  },
});
```

#### COPPA support

COPPA support can be enabled for all the visitors by changing the config value:

```js
config.setConfig({ coppa: true });
```
