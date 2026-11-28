# Overview

```
Module Name: Riptide Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@riptideads.com
```

# Description

Connects to Riptide over OpenRTB 2.6 (`POST https://serve.riptideads.com/ortb`) for banner, video
(instream and outstream) and native. A multi-format ad unit is sent as one imp carrying each
format, and bids come back typed by `mtype`.

- Video: the ad unit's `context` is sent as `imp.video.plcmt` (outstream 4, instream 1) unless the
  ad unit sets `plcmt` itself. An outstream ad unit needs the publisher's own player as
  `mediaTypes.video.renderer`: the adapter returns the VAST markup (`vastXml`) and no renderer.
- Native: ORTB native 1.2 request and response (`mediaTypes.native.ortb`).
- Consent and supply chain: GDPR TCF, US Privacy, GPP, COPPA and `source.schain` travel at their
  OpenRTB 2.6 locations. First-party data (`ortb2`, `ortb2Imp`, including `ext.gpid`, `instl`,
  `rwdd`, `user.eids` from the userId modules and `regs.ext.dsa`) is passed through.
- Floors: the price floors module's USD floor, else the `bidfloor` param.
- User sync: one image sync (an iframe only when image syncs are not allowed) to
  `https://sync.riptideads.com/usersync`, carrying the page's consent signals.
- Storage: the adapter sets nothing in the browser. Bid requests carry cookies only when device
  access is permitted (TCF purpose 1 where GDPR applies), so the id the user sync set
  (`rt_uid`, on `.riptideads.com`) can reach the serving host.

The `riptide` code has no IAB TCF Global Vendor List id yet. Where Prebid's TCF enforcement
applies, EU traffic that requires consent is not sent to the bidder until one is registered.

Riptide is a white-label platform: a partner running on Riptide bids under its own bidder code,
registered as an alias of `riptide` with its own serving and sync host. Use the partner's code as
the `bidder`. A page must not alias `riptide` itself (`pbjs.aliasBidder`), because only codes the
adapter knows have an endpoint. Alias user syncs need
`pbjs.setConfig({ userSync: { aliasSyncEnabled: true } })`.

# Bid Params

| Name          | Scope    | Description                                          | Example        | Type     |
|---------------|----------|------------------------------------------------------|----------------|----------|
| `publisherId` | required | The publisher's public id in Riptide                 | `'pub1'`       | `string` |
| `placementId` | required | The placement's public id (`imp.tagid`)              | `'tag-direct'` | `string` |
| `bidfloor`    | optional | Floor, USD CPM; the price floors module's floor wins | `0.25`         | `number` |

# Test Parameters

Riptide's test placement always answers with a test creative of the requested type.

```js
var RIPTIDE_TEST_PARAMS = { publisherId: 'riptide-prebid-test', placementId: 'riptide-prebid-test-all' };

var adUnits = [{
  code: 'test-banner',
  mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
  bids: [{ bidder: 'riptide', params: RIPTIDE_TEST_PARAMS }]
}, {
  code: 'test-instream',
  mediaTypes: { video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'], protocols: [2, 3, 7, 8], plcmt: 1 } },
  bids: [{ bidder: 'riptide', params: RIPTIDE_TEST_PARAMS }]
}, {
  code: 'test-outstream',
  mediaTypes: { video: {
    context: 'outstream', playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [2, 3, 7, 8],
    renderer: {
      url: 'https://cdn.example.com/your-outstream-player.js',
      render: function (bid) { bid.renderer.push(function () { window.YourOutstreamPlayer.play(bid.adUnitCode, bid.vastXml); }); }
    }
  } },
  bids: [{ bidder: 'riptide', params: RIPTIDE_TEST_PARAMS }]
}, {
  code: 'test-native',
  mediaTypes: { native: { ortb: { ver: '1.2', assets: [
    { id: 1, required: 1, title: { len: 90 } },
    { id: 2, required: 1, img: { type: 3, w: 1200, h: 627 } }
  ] } } },
  bids: [{ bidder: 'riptide', params: RIPTIDE_TEST_PARAMS }]
}];

// Video bids carry VAST XML, not a VAST URL, so instream needs Prebid Cache or the local cache.
pbjs.setConfig({ cache: { useLocal: true } });
```
