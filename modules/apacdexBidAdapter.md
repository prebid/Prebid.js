# Overview

```
Module Name: APAC Digital Exchange Bidder Adapter
Module Type: Bidder Adapter
Maintainer: ken@apacdex.com
```

# Description

Connects to APAC Digital Exchange for bids.
Apacdex bid adapter supports Banner and Video (Instream and Outstream) ads.

# Sample Banner Ad Unit
```
var adUnits = [
  {
    code: 'test-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300,600]]
      }
    },
    bids: [
      {
          bidder: 'apacdex',
          params: {
              siteId: 'apacdex1234', // siteId provided by Apacdex
              floorPrice: 0.01, // default is 0.01 if not declared
          }
      }
    ]
  }
];
```

# Sample Video Ad Unit: Instream
```
var videoAdUnit = {
  code: 'test-div',
  sizes: [[640, 480]],
  mediaTypes: {
    video: {
      playerSize: [[640, 480]],
      context: "instream"
      api: [2],
      placement: 1,
      skip: 1,
      linearity: 1,
      minduration: 1,
      maxduration: 120,
      mimes: ["video/mp4", "video/x-flv", "video/x-ms-wmv", "application/vnd.apple.mpegurl", "application/x-mpegurl", "video/3gpp", "video/mpeg", "video/ogg", "video/quicktime", "video/webm", "video/x-m4v", "video/ms-asf", video/x-msvideo"],
      playbackmethod: [6],
      startdelay: 0,
      protocols: [1, 2, 3, 4, 5, 6]
    },
  },
  bids: [
    {
      bidder: 'apacdex',
      params: {
        siteId: 'apacdex1234', // siteId provided by Apacdex
        floorPrice: 0.01, // default is 0.01 if not declared
      }
    }
  ]
};
```
mediaTypes.video object reference to section 3.2.7 Object: Video in the OpenRTB 2.5 document
You must review all video parameters to ensure validity for your player and DSPs

# Sample Video Ad Unit: Outstream
```
var videoAdUnit = {
  code: 'test-div',
  sizes: [[410, 231]],
  mediaTypes: {
    video: {
      playerSize: [[410, 231]],
      context: "outstream"
      api: [2],
      placement: 5,
      linearity: 1,
      minduration: 1,
      maxduration: 120,
      mimes: ["video/mp4", "video/x-flv", "video/x-ms-wmv", "application/vnd.apple.mpegurl", "application/x-mpegurl", "video/3gpp", "video/mpeg", "video/ogg", "video/quicktime", "video/webm", "video/x-m4v", "video/ms-asf", video/x-msvideo"],
      playbackmethod: [6],
      startdelay: 0,
      protocols: [1, 2, 3, 4, 5, 6]
    },
  },
  bids: [
    {
      bidder: 'apacdex',
      params: {
        siteId: 'apacdex1234', // siteId provided by Apacdex
        floorPrice: 0.01, // default is 0.01 if not declared
      }
    }
  ]
};
```
mediaTypes.video object reference to section 3.2.7 Object: Video in the OpenRTB 2.5 document
You must review all video parameters to ensure validity for your player and DSPs