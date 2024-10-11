# Overview

```
Module Name: Playdigo Bidder Adapter
Module Type: Playdigo Bidder Adapter
Maintainer: yr@playdigo.com
```

# Description

One of the easiest way to gain access to Playdigo demand sources - Playdigo header bidding adapter.
Playdigo header bidding adapter connects with Playdigo demand sources to fetch bids for display placements

# Test Parameters
```
  var adUnits = [
    {
        code: 'adunit1',
        mediaTypes: {
            banner: {
                sizes: [ [300, 250], [320, 50] ],
            }
        },
        bids: [
            {
                bidder: 'playdigo',
                params: {
                    placementId: 'testBanner',
                }
            }
        ]
    },
    {
        code: 'addunit2',
        mediaTypes: {
            video: {
                playerSize: [ [640, 480] ],
                context: 'instream',
                minduration: 5,
                maxduration: 60,
            }
        },
        bids: [
            {
                bidder: 'playdigo',
                params: {
                    placementId: 'testVideo',
                }
            }
        ]
    },
    {
        code: 'addunit3',
        mediaTypes: {
            native: {
                title: {
                    required: true
                },
                body: {
                    required: true
                },
                icon: {
                    required: true,
                    size: [64, 64]
                }
            }
        },
        bids: [
            {
                bidder: 'playdigo',
                params: {
                    placementId: 'testNative',
                }
            }
        ]
    }
  ];
```
