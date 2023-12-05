# Overview

```
Module Name: R2B2 Bid Adapter
Module Type: Bidder Adapter
Maintainer: dev@r2b2.cz
```

## Description

Module that integrates R2B2 demand sources. To get your bidder configuration reach out to our account team on partner@r2b2.io



## Test unit

```javascript
  var adUnits = [
    {
      code: 'test-r2b2',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]],
        }
      },
      bids: [{
        bidder: 'r2b2',
        params: {
            pid: 'selfpromo'
        }
      }]
    }
  ];
```
## Rendering

Our adapter can feature a custom renderer specifically for display ads, tailored to enhance ad presentation and functionality. This is particularly beneficial for non-standard ad formats that require more complex logic. It's important to note that our rendering process operates outside of SafeFrames. For additional information, not limited to rendering aspects, please feel free to contact us at partner@r2b2.io
