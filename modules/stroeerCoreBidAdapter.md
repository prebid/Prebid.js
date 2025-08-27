## Overview

```
Module Name: Stroeer Bidder Adapter
Module Type: Bidder Adapter
Maintainer: help@cz.stroeer-labs.com
```

### Bid Params

| Name          | Scope    | Description        | Example                                 | Type     |
|---------------|----------|--------------------|-----------------------------------------|----------|
| `sid`         | required | Slot ID            | `'06b782cc-091b-4f53-9cd2-0291679aa1ac'`| `string` |

### Ad Unit Configuration

#### Banner

* The server will ignore sizes that are not supported by the slot or by the platform (such as 987x123).

##### Example

```javascript
var adUnits = [
  { 
    code: 'your-banner-adunit-code',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      }
    },
    bids: [{
      bidder: 'stroeerCore',
      params: {
        sid: '06b782cc-091b-4f53-9cd2-0291679aa1ac'
      }    
    }]
  }
];
```

#### Video

* Both instream and outstream contexts are supported.
* We do not provide an outstream renderer. You will need to set up your own. See [Show Outstream Video Ads](https://docs.prebid.org/dev-docs/show-outstream-video-ads.html) for more information.
* On `mediaTypes.video`, the fields `context` and `mediaTypes` are required.

##### Example

```javascript
var adUnits = [
  {
    code: 'your-video-adunit-code',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4', 'video/quicktime', 'video/x-ms-wmv']
      }
    },
    bids: [{
      bidder: 'stroeerCore',
      params: {
        sid: '35d4225e-f8e3-4f45-b1ea-77913afd00d1'
      }
    }]
  }
];
```
