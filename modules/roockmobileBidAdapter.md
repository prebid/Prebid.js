# Overview

```
Module Name: Roockmobile Bidder Adapter
Module Type: Bidder Adapter
Maintainer: qun.ma@roockmobile.com
```

# Description

The Roockmobile bidder adapter supports banner, video, and native inventory. Use `roockmobile` as the bidder code.

Bid requests are sent to `https://pbjs.rmcdnnode.com/pbjs`: `mid` and `token` are URL query parameters; `tagid` is sent as `imp[].tagid` in the OpenRTB POST body. The adapter registers `https://pbjs.rmcdnnode.com/usersync` when user syncing is enabled.

The adapter supports multiformat ad units. Roockmobile responses may identify the selected format with `bid.ext.mtype`; when it is absent, the adapter infers video and native responses from their standard VAST or Native markup.

## Bid parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `mid` | string | Yes | Roockmobile channel identifier assigned to the publisher; sent in the request URL. |
| `token` | string | Yes | Roockmobile authentication token; sent in the request URL. |
| `tagid` | string | No | Overrides the standard placement identifier from `ortb2Imp.tagid`; sent in `imp[].tagid`. One of these locations must provide a value. |
| `test` | number | No | Set to numeric `1` for testing and review. This sends OpenRTB root field `test: 1` so the test endpoint configuration returns a test creative. Do not enable it in production. |
| `domain` | string | No | HTTPS origin override under a Roockmobile-controlled domain. The adapter always uses `/pbjs` for bids and `/usersync` for user sync. |

No other bidder parameters are used.

The default URLs remain `https://pbjs.rmcdnnode.com/pbjs` and `https://pbjs.rmcdnnode.com/usersync`. A test or staging deployment can override their shared origin with an HTTPS host under `rmcdnnode.com` or `roockmobile.com`, but cannot override the fixed paths. Invalid, non-HTTPS, or third-party origins fall back to the default domain:

```javascript
params: {
  mid: 'YOUR_MID',
  token: 'YOUR_TOKEN',
  tagid: 'YOUR_TAGID',
  domain: 'https://test.rmcdnnode.com'
}
```

## Test and review mode

Use the channel-specific `mid`, `token`, and `tagid` supplied by Roockmobile. To request the guaranteed test creative during integration testing or Prebid review, add numeric `test: 1`:

```javascript
params: {
  mid: 'YOUR_MID',
  token: 'YOUR_TOKEN',
  tagid: 'YOUR_TAGID',
  test: 1
}
```

The `test` value is carried in the OpenRTB request body as a root-level field; it is not a URL query parameter. The converter sends `test: 0` for normal traffic and the adapter changes it to `test: 1` when the bidder parameter is numeric `1`. Omit the bidder parameter in production. Runnable banner, video, and native test pages are provided under `integrationExamples/noadserver/` with the review credentials.

## User sync

The adapter uses Prebid's standard user-sync registration. It prefers an iframe sync when the publisher enables one and otherwise uses an image sync when permitted. Publishers enable iframe syncing through `userSync.filterSettings`; the adapter does not write cookies or insert pixels directly.

For video, declare the standard Prebid `mediaTypes.video` fields (for example, `mimes`, `playerSize`, `minduration`, and `maxduration`). The adapter forwards applicable fields as OpenRTB `imp[].video` fields. Video responses are interpreted as VAST XML. OpenRTB `nurl` is treated as a win-notice URL and is called by the adapter after the bid wins; it is not exposed as a VAST URL. For outstream video, configure the publisher's own Prebid renderer; the Tappx-specific outstream player is intentionally not included.

## Banner example

```javascript
const adUnits = [{
  code: 'roockmobile-banner',
  mediaTypes: { banner: { sizes: [[300, 250], [320, 50]] } },
  bids: [{
    bidder: 'roockmobile',
    params: { mid: 'YOUR_MID', token: 'YOUR_TOKEN', tagid: 'YOUR_TAGID' }
  }]
}];
```

## Video example

```javascript
const adUnits = [{
  code: 'roockmobile-video',
  mediaTypes: {
    video: {
      context: 'instream',
      mimes: ['video/mp4'],
      playerSize: [[640, 360]],
      minduration: 5,
      maxduration: 30,
      protocols: [2, 3],
      playbackmethod: [2]
    }
  },
  bids: [{
    bidder: 'roockmobile',
    params: { mid: 'YOUR_MID', token: 'YOUR_TOKEN', tagid: 'YOUR_VIDEO_TAGID' }
  }]
}];
```

For outstream video, set `context: 'outstream'` and add a publisher-owned Prebid renderer to the ad unit. The adapter returns VAST XML but does not load a Roockmobile-specific player.

See `integrationExamples/noadserver/roockmobileBidAdapter_video_sample.html` for a request demo that validates the returned VAST XML and plays its first MP4 `MediaFile` with a native HTML video element. The sample is intentionally a lightweight protocol test; production integrations should use an instream VAST player such as IMA, JW Player, or a GAM video creative.

The VAST `Duration` must be non-zero and within the requested `minduration`/`maxduration`. Media files should use HTTPS, return an appropriate video content type, and support normal browser media delivery (including byte-range requests). Response `w` and `h` should describe the requested video player size.

For instream bids that return only VAST XML, publishers must configure Prebid Cache or explicitly enable `cache.allowVastXmlOnly`. The integration example enables `allowVastXmlOnly` because it reads and plays `vastXml` directly.

## Native example

```javascript
const adUnits = [{
  code: 'roockmobile-native',
  mediaTypes: {
    native: {
      title: { required: true },
      image: { required: true },
      sponsoredBy: { required: false }
    }
  },
  bids: [{
    bidder: 'roockmobile',
    params: { mid: 'YOUR_MID', token: 'YOUR_TOKEN', tagid: 'YOUR_NATIVE_TAGID' }
  }]
}];
```

The adapter uses Prebid's standard OpenRTB converter, which serializes this declaration as `imp[].native.request` and maps standard OpenRTB native response assets back to Prebid. See `integrationExamples/noadserver/roockmobileBidAdapter_native_sample.html` for the runnable native test page.
