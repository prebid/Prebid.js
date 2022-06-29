# OperaAds Bidder Adapter

## Overview

```
Module Name: OperaAds Bidder Adapter
Module Type: Bidder Adapter
Maintainer: adtech-prebid-group@opera.com
```

## Description

Module that connects to OperaAds's demand sources

## Bid Parameters

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `placementId` | required | String | The Placement Id provided by Opera Ads. | `s5340077725248`
| `endpointId` | required | String | The Endpoint Id provided by Opera Ads. | `ep3425464070464`
| `publisherId` | required | String | The Publisher Id provided by Opera Ads. | `pub3054952966336`
| `bcat` | optional | String or String[] | The bcat value. | `IAB9-31`

### Bid Video Parameters

Set these parameters to `bid.mediaTypes.video`.

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `context` | optional | String | `instream` or `outstream`. | `instream`
| `mimes` | optional | String[] | Content MIME types supported. | `['video/mp4']`
| `playerSize` | optional | Number[] or Number[][] | Video player size in device independent pixels | `[[640, 480]]`
| `protocols` | optional | Number[] | Array of supported video protocls. | `[1, 2, 3, 4, 5, 6, 7, 8]`
| `startdelay` | optional | Number | Indicates the start delay in seconds for pre-roll, mid-roll, or post-roll ad placements. | `0`
| `skip` | optional | Number | Indicates if the player will allow the video to be skipped, where 0 = no, 1 = yes. | `1`
| `playbackmethod` | optional | Number[] | Playback methods that may be in use. | `[2]`
| `delivery` | optional | Number[] | Supported delivery methods. | `[1]`
| `api` | optional | Number[] | List of supported API frameworks for this impression. | `[1, 2, 5]`

### Bid Native Parameters

Set these parameters to `bid.nativeParams` or `bid.mediaTypes.native`.

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `title` | optional | Object | Config for native asset title. | `{required: true, len: 25}`
| `image` | optional | Object | Config for native asset image. | `{required: true, sizes: [[300, 250]], aspect_ratios: [{min_width: 300, min_height: 250, ratio_width: 1, ratio_height: 1}]}`
| `icon` | optional | Object | Config for native asset icon. | `{required: true, sizes: [[60, 60]], aspect_ratios: [{min_width: 60, min_height: 60, ratio_width: 1, ratio_height: 1}]}}`
| `sponsoredBy` | optional | Object | Config for native asset sponsoredBy. | `{required: true, len: 20}`
| `body` | optional | Object | Config for native asset body. | `{required: true, len: 200}`
| `cta` | optional | Object | Config for native asset cta. | `{required: true, len: 20}`

## Example

### Banner Ads

```javascript
var adUnits = [{
  code: 'banner-ad-div',
  mediaTypes: {
    banner: {
      sizes: [[300, 250]]
    }
  },
  bids: [{
    bidder: 'operaads',
    params: {
      placementId: 's5340077725248',
      endpointId: 'ep3425464070464',
      publisherId: 'pub3054952966336'
    }
  }]
}];
```

### Video Ads

```javascript
var adUnits = [{
  code: 'video-ad-div',
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [640, 480],
      mimes: ['video/mp4'],
      protocols: [1, 2, 3, 4, 5, 6, 7, 8],
      playbackmethod: [2],
      skip: 1
    }
  },
  bids: [{
    bidder: 'operaads',
    params: {
      placementId: 's5340077725248',
      endpointId: 'ep3425464070464',
      publisherId: 'pub3054952966336'
    }
  }]
}];
```

* For video ads, enable prebid cache.

```javascript
pbjs.setConfig({
  cache: {
    url: 'https://prebid.adnxs.com/pbc/v1/cache'
  }
});
```

### Native Ads

```javascript
var adUnits = [{
  code: 'native-ad-div',
  mediaTypes: {
    native: {
      title: { required: true, len: 75  },
      image: { required: true, sizes: [[300, 250]] },
      body: { len: 200  },
      sponsoredBy: { len: 20 }
    }
  },
  bids: [{
    bidder: 'operaads',
    params: {
      placementId: 's5340077725248',
      endpointId: 'ep3425464070464',
      publisherId: 'pub3054952966336'
    }
  }]
}];
```

### User Ids

Opera Ads Bid Adapter uses `sharedId`, `pubcid` or `tdid`, please config at least one.

```javascript
pbjs.setConfig({
  ...,
  userSync: {
    userIds: [{
      name: 'sharedId',
      storage: {
        name: '_sharedID', // name of the 1st party cookie
        type: 'cookie',
        expires: 30
      }
    }]
  }
});
```
