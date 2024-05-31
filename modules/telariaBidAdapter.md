# Overview

```
Module Name: Telaria Bid Adapter
Module Type: Bidder Adapter
Maintainer: github@telaria.com
```

# Description

Connects to Telaria's exchange.

Telaria bid adapter supports instream Video.

# Test Parameters
```
{
    code: 'video1',
    mediaTypes: {
        'video': {
            playerSize: [640, 480],
            context: 'instream'
        }
    },
    bids: [{
        bidder: 'telaria',
        params: {
            supplyCode: 'ssp-demo-rm6rh',
            adCode: 'ssp-!demo!-lufip',
            videoId: 'MyCoolVideo'
        }
    }]
}
```

# Example:
https://console.telaria.com/examples/hb/headerbidding.jsp
