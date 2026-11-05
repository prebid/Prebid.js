# Gamera Bid Adapter

Module Type: Bidder Adapter
Maintainer: support@gamera.ai

Connects publisher-selected banner and instream-video ad units to Gamera demand.
Use bidder code `gamera`, with no required bid params. For explicit review demand,
set `params: { test: true }` on each desired ad unit. The temporary review endpoint
returns USD 0.01 CPM test creatives for those units and HTTP 204 otherwise. It
creates no billing events or SDK sessions. These are synthetic test bids, not live
paid demand. The separate production bidder remains under development. `gameraEnabled` is ignored
by this bundled adapter. Optional `gameraPublisher` selects the registered account
hostname; otherwise tracker metadata or Prebid's page hostname is used. The account
is fixed for the pageview. Website origins must be authorized by Gamera.

## Test parameters

Test page: https://bidder.rapidedge.io/test/

```js
pbjs.setConfig({ gameraPublisher: "bidder.rapidedge.io" });
pbjs.addAdUnits([
  {
    "code": "gamera-test-banner",
    "mediaTypes": {
      "banner": {
        "sizes": [
          [
            300,
            250
          ]
        ]
      }
    },
    "bids": [
      {
        "bidder": "gamera",
        "params": {
          "test": true
        }
      }
    ]
  },
  {
    "code": "gamera-test-video",
    "mediaTypes": {
      "video": {
        "context": "instream",
        "playerSize": [
          [
            640,
            360
          ]
        ],
        "mimes": [
          "video/mp4"
        ],
        "protocols": [
          13
        ],
        "minduration": 1,
        "maxduration": 30,
        "linearity": 1
      }
    },
    "bids": [
      {
        "bidder": "gamera",
        "params": {
          "test": true
        }
      }
    ]
  }
]);
```

## Disclosures

Requests use Prebid transport to `https://bidder.rapidedge.io/v1/prebid/auction`.
The adapter needs no external code and does not download Gamera.js or the SDK.
It creates no cookies, local storage, user-sync pixels, or DOM elements. Returned
banner creatives contain a render iframe; video uses VAST. The adapter does not
read the PBJS global, modify ad units, or cache previous bids.

Optional `window.gamera.bidderDataV1` provides context and account metadata.
The adapter calls its `acceptSession` and `stop` methods when available. These
callbacks can start or stop the separately installed Gamera telemetry SDK, which
can download code and send non-auction observations. This indirect activity is
explicitly submitted for Prebid policy review, not claimed exempt. Publishers
can omit Gamera.js; auction operation is independent of it. Each adapter instance
has separate session and account state; the optional provider receives an owner key.
RTD data in `ortb2Imp.ext.data.gameraBidder` is a fallback, then plain Prebid data.
The existing Gamera RTD module itself depends on Gamera.js.

Privacy: TCF-EU vendor 1447; consent is supplied by Prebid. No GPP, US Privacy,
COPPA, EIDs or supply-chain support is claimed by this submission. No native or
outstream support. No floors-module integration is claimed. Gamera.js analytics
has independent consent behavior. Review these limitations before deployment.
