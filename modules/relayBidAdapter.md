# Overview

```
Module Name: Relay Bid Adapter
Module Type: Bid Adapter
Maintainer: relay@kevel.co
```

# Description

Connects to Relay exchange API for bids.
Supports Banner, Video and Native.

# Test Parameters

```
var adUnits = [
  // Banner with minimal bid configuration
  {
    code: 'minimal',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
        bidder: 'relay',
        params: {
          accountId: 1234
        },
        ortb2imp: {
          ext: {
            relay: {
              bidders: {
                bidderA: {
                  param: 1234
                }
              }
            }
          }
        }
      }
    ]
  },
  // Minimal video
  {
    code: 'video-minimal',
    mediaTypes: {
      video: {
        maxduration: 30,
        api: [1, 3],
        mimes: ['video/mp4'],
        placement: 3,
        protocols: [2,3,5,6]
      }
    },
    bids: [
      {
        bidder: 'relay',
        params: {
          accountId: 1234
        },
        ortb2imp: {
          ext: {
            relay: {
              bidders: {
                bidderA: {
                  param: 'example'
                }
              }
            }
          }
        }
      }
    ]
  }
];
```
