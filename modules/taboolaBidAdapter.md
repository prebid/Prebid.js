# Overview

```
Module Name: Taboola Adapter
Module Type: Bidder Adapter
Maintainer: headerbidding@taboola.com
```

# Description

Module that connects to Taboola bidder to fetch bids.
support display format. Using OpenRTB standard.

# Configuration

# Test Display Parameters
```
   var adUnits = [{
            code: 'your-unit-container-id',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250], [300,600]],
                }
            },
            bids: [{
                bidder: 'taboola',
                params: {
                  tagId: 'test-1',
                  publisherId: 'test',
                  bidfloor: 0.25, // optional default is null
                  bidfloorcur: 'USD', // optional default is USD
                  bcat: ['IAB1-1'], // optional default is []
                  badv: ['example.com']  // optional default is []
                }
            }]
        }];

```
