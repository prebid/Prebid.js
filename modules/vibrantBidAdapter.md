# Overview

```
Module Name: Vibrant Bidder Adapter
Module Type: Bidder Adapter
Maintainer: kormorant@vibrantmedia.com
```

# Description

Module that allows Vibrant Media to provide ad bids for banner, native and video (outstream only).

# Test Parameters

```
var adUnits = [
  // Banner ad unit
  {
    "code": "test-banner",
    "id": "test-12345",
    "requestId": "test-req-1",
    "bidder": "vibrantmedia",
    "mediaTypes": {
      "banner": {
        "sizes": [[300, 250]]
      }
    }
  },
  // Video (outstream) ad unit
  {
    "code": "test-video-outstream",
    "id": "test-67890",
    "requestId": "test-req-1",
    "bidder": "vibrantmedia",
    "mediaTypes": {
      "video": {
        "context": "outstream",
        "sizes": [[300, 250]]
      }
    }
  },
  // Native ad unit
  {
    "code": "test-native",
    "id": "test-13579",
    "requestId": "test-req-1",
    "bidder": "vibrantmedia",
    "mediaTypes": {
      "native": {
        "image": {
          "required": true,
          "sizes": [[300, 250]]
        },
        "title": {
          "required": true
        },
        "sponsoredBy": {
          "required": true
        },
        "clickUrl": {
          "required": true
        }
      }
    }
  }
];
```
