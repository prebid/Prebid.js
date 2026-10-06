# Overview

```
Module Name:  C-WIRE Bid Adapter
Module Type:  Bidder Adapter
Maintainer: devs@cwire.com
```

## Description

Prebid.js Adapter for C-Wire. Uses native OpenRTB 2.x request/response handling via Prebid's `ortbConverter` library. Supports banner and video.

Bid requests are POSTed as OpenRTB 2.x JSON to `https://prebid2.cwi.re/v1/bid`. Bidder params and cwire-specific signals are carried under `imp[].ext.bidder` and `request.ext.cwire` / `imp[].ext.cwire`.

## Configuration

Below, the list of C-WIRE params and where they can be set.

| Param name  | URL parameter | AdUnit config |   Type   | Required |
|-------------|:-------------:|:-------------:|:--------:|:--------:|
| pageId      |               |       x       |  number  |    NO    |
| domainId    |               |       x       |  number  |   YES    |
| placementId |               |       x       |  number  |    NO    |
| cwgroups    |       x       |               |  string  |    NO    |
| cwcreative  |       x       |               |  string  |    NO    |
| cwdebug     |       x       |               | boolean  |    NO    |
| cwfeatures  |       x       |               |  string  |    NO    |

### adUnit configuration

#### Banner

```javascript
var adUnits = [
  {
    code: 'target_div_id', // REQUIRED
    bids: [{
      bidder: 'cwire',
      mediaTypes: {
        banner: {
          sizes: [[400, 600]],
        }
      },
      params: {
        domainId: 1422,               // required - number
        placementId: 2211521,         // optional - number
      }
    }]
  }
];
// legacy configuration (still supported)
var adUnits = [
    {
        code: 'target_div_id', // REQUIRED
        bids: [{
            bidder: 'cwire',
            mediaTypes: {
                banner: {
                    sizes: [[400, 600]],
                }
            },
            params: {
                pageId: 1422,               // required - number
                placementId: 2211521,       // required - number
            }
        }]
    }
];
```

#### Video

```javascript
var adUnits = [
  {
    code: 'video_target_div_id', // REQUIRED
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        startdelay: 0,
        placement: 1,
        playbackmethod: [2],
        api: [2],
        linearity: 1
      }
    },
    bids: [{
      bidder: 'cwire',
      params: {
        domainId: 1422,               // required - number
        placementId: 2211521,         // optional - number
      }
    }]
  }
];
```

### URL parameters

For debugging and testing purposes URL parameters can be set.

**Example:**

`https://www.some-site.com/article.html?cwdebug=true&cwfeatures=feature1,feature2&cwcreative=1234`
