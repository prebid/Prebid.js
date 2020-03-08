# Overview
```
Module Name: Logicad for Publishers
Module Type: Bidder Adapter
Maintainer: prebid@so-netmedia.jp
```

# Description
Module that connects to Logicad's demand sources.
Currently module supports only banner mediaType.

# Test Parameters
```
    var adUnits = [{
        code: 'test-code',
        sizes: [[300, 250],[300, 600]],
        bids: [{
            bidder: 'logicad',
            params: {
                tid: 'test',
                page: 'url',
            }
        }]
    }];
```
