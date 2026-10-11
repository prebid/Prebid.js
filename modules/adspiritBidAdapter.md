Overview
```text
Module Name:  AdSpirit Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   prebid@adspirit.de
```
Description
Connects Prebid.js to the AdSpirit exchange for banner and native bids.
The module registers the bidder codes `adspirit` and `twiago`.
For `adspirit`, both `placementId` and `host` are required.
For `twiago`, `placementId` is required and the adapter uses `a.twiago.com`
as the host.
Supported features
Banner media type
Native media type using OpenRTB Native 1.2
Banner/native multi-format ad units
SupplyChain Object forwarding from `ortb2.source.ext.schain`
User ID EIDs from `userIdAsEids`
Advertiser domains in bid-response metadata
TCF-EU/GDPR consent forwarding when consent data is supplied by Prebid.js
Banner iframe-breakout opt-out through `allowIframeBreakout`
Bid parameters
Name	Scope	Description	Example	Type
`placementId`	required	AdSpirit placement ID	`'99'`	`string`
`host`	required for `adspirit`	AdSpirit host provided for the account. It is not required for the `twiago` alias.	`'test.adspirit.de'`	`string`
`bidfloor`	optional	Minimum bid price. The adapter sends the value in EUR.	`0.10`	`number` or numeric `string`
`siteId`	optional	OpenRTB `site.id` value	`'site-123'`	`string`
`publisherId`	optional	OpenRTB `site.publisher.id` value	`'publisher-123'`	`string`
`publisherName`	optional	OpenRTB `site.publisher.name` value	`'Example Publisher'`	`string`
`allowIframeBreakout`	optional	Controls whether AdSpirit banner markup is allowed to render outside its iframe. Enabled by default; `false`, `'false'`, `0` or `'0'` disable it. Applies to the traditional AdSpirit banner response.	`false`	`boolean`, `string` or `number`
Banner example
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
Banner rendering and iframe breakout
For the traditional AdSpirit banner response (`cpm`, `w`, `h`, `adm` in the
response body), the adapter generates render markup that loads `adasync.min.js`.
It passes an internal connection ID created by `buildRequests()` to the renderer.
Do not set `adspiritConId` yourself in the publisher configuration.
Iframe breakout is enabled by default (`window.inDapIF=true`) to support
special AdSpirit ad formats that may render outside the ad iframe. To opt out:
```javascript
{
  bidder: 'adspirit',
  params: {
    placementId: '7',
    host: 'test.adspirit.de',
    allowIframeBreakout: false
  }
}
```
The values `false`, `'false'`, `0` and `'0'` disable iframe breakout; an omitted
parameter or `true` leaves it enabled. Disabling it can prevent special formats
that depend on access to the surrounding page from rendering as intended.
Current limitation: For a non-native OpenRTB `seatbid` response, the adapter
does not currently attach the banner HTML (`ad`) or the `banner` media type.
This response format should not be treated as a supported replacement for the
traditional AdSpirit banner response without an adapter change.
Twiago alias example
The `twiago` bidder does not need a `host` parameter; the host is always
`a.twiago.com`:
```javascript
{
  bidder: 'twiago',
  params: { placementId: '9128' }
}
```
Native example
Native assets must be defined directly under `mediaTypes.native.ortb.assets`.
Do not place them inside an additional `request` object. Prebid.js normalizes
the accepted configuration into `nativeOrtbRequest`, which the adapter uses to
build the OpenRTB Native request.
Important: Merely including `mediaTypes.native` is not sufficient. If Prebid
has not produced `nativeOrtbRequest`, the adapter does not send an OpenRTB Native
imp and skips any Native bid received in response. The adapter defaults the
OpenRTB Native version to `1.2` if no version was specified.
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
Native asset overview
The asset IDs in the example are conventions used by this configuration:
Title (`id: 1`) — requested as mandatory with a maximum length of
100 characters.
Main image (`id: 2`) — requested as mandatory, using image type `3`.
Body text (`id: 4`) — requested as mandatory with a maximum length of
150 characters.
Call to action (`id: 3`) — requested as optional using data type `12`.
Sponsored by (`id: 6`) — requested as optional using data type `1`.
Icon (`id: 5`) — requested as optional using image type `1`.
The adapter does not enforce a fixed mandatory set of native assets. Whether an
asset is mandatory is controlled by the `required` value in the publisher's
native request.
The click URL is returned by the bidder in `native.link.url`; it is not a
request asset. The adapter also retains the complete OpenRTB Native response,
including response event trackers, in the native ORTB response object.

Native response mapping
The adapter maps response assets to legacy Prebid native fields according to the
requested asset ID and asset type, rather than assuming fixed asset IDs:
`title`, `image`, `icon`, `body`, `cta`, and `sponsoredBy`. A duplicate asset or
an asset that cannot be mapped to a requested legacy field is exposed in an
additional property such as `data_4_extra1` or `image_2_extra1`.
The response includes `native.clickUrl` from `native.link.url`,
`native.impressionTrackers` from `native.imptrackers` (or `[]` when absent), and
the complete original Native response in `native.ortb`. Publishers rendering
Native bids should use the native rendering interface provided by their Prebid
setup rather than assuming the adapter provides banner HTML for Native bids.
Native event tracker limitation
Current behavior: The adapter serializes only `ver` and `assets` into
`imp.native.request`. Even if `mediaTypes.native.ortb.eventtrackers` is provided,
it is not forwarded in that Native request object. The adapter does retain
`eventtrackers` returned by the bidder in `native.ortb`; this is not the same as
sending tracker capabilities to the bidder or automatically firing trackers.
If the exchange needs explicit requested event trackers, the adapter must be
updated before claiming that support.
Privacy
When Prebid.js supplies `gdprConsent`, the adapter forwards `gdprApplies` and
the consent string in both the request URL and the OpenRTB request.
Using the adapter does not by itself guarantee legal compliance. Publishers are
responsible for their consent configuration and applicable legal requirements.
GDPR transmission details
When `gdprConsent` is present, `gdpr` (as `1` or `0`) and the URL-encoded
consent string are added to the request URL. The adapter also sends GDPR fields
in `regs.ext` and the consent string in `user.ext.consent`. When Prebid supplies
no consent object, these OpenRTB fields default to `0` and `''`, while the
corresponding URL parameters are omitted. These values reflect what the adapter
sends; they are not an independent consent decision.
AdSpirit privacy information
IAB Europe CMP list
AdSpirit list of functions that require consent

Local unit tests (adapter development)
Inside the Prebid.js repository root (not `C:\Windows\System32`), the
adapter and tests should be located at:
```text
modules/adspiritBidAdapter.js
test/spec/modules/adspiritBidAdapter_spec.js
```
Install project dependencies if they are missing:
```powershell
npm.cmd ci
```
Run only the AdSpirit unit tests:
```powershell
npx.cmd gulp test --file "test/spec/modules/adspiritBidAdapter_spec.js" --nolint
```
Run them with coverage enabled:
```powershell
npx.cmd gulp test --file "test/spec/modules/adspiritBidAdapter_spec.js" --coverage --nolint
```
The `npm.cmd` / `npx.cmd` forms work in Windows PowerShell even if the execution
policy prevents running `npm.ps1` / `npx.ps1`. These commands require the local
Prebid.js project and its development dependencies; an isolated test run does
not replace a run against the complete Prebid.js repository. Coverage report
output paths depend on the checked-out Prebid version and its test setup.
