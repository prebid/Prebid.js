# Overview

```
Module Name: AdKernel ADN Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid-dev@adkernel.com
```

# Description

Connects to AdKernel Ad Delivery Network
Banner and video formats are supported.


# Test Parameters
```
    var adUnits = [
      {
        code: 'banner-ad-div',
        sizes: [[300, 250], [300, 200]],
        bids: [
          {
            bidder: 'adkernelAdn',
            params: {
              pubId: 50357,
              host: 'dsp-staging.adkernel.com'
            }
          }
        ]
      }, {
        code: 'video-ad-player',
        sizes: [640, 480],
        bids: [
          {
            bidder: 'adkernelAdn',
            mediaType : 'video',
            params: {
              pubId: 50357,
              host: 'dsp-staging.adkernel.com'
            }
          }
        ]
      }
    ];
```
