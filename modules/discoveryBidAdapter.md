# Overview

```
Module Name: discovery Bid Adapter
Module Type: Bidder Adapter
```

# Description

Module that connects to popIn's demand sources.

The discovery Bidding adapter requires setup before beginning. Please contact us at <media-support@popin.cc>

# Test Parameters
```
    var adUnits = [
      // native
      {
        code: "test-div-1",
        mediaTypes: {
          native: {
            title: {
              required: true
            },
            image: {
              required: true
            }
          }
        },
        bids: [
          {
            bidder: "discovery",
            params: {
              token: "a1b067897e4ae093d1f94261e0ddc6c9",
              tagid: 'test_tagid',
              publisher: 'test_publisher'
            },
          },
        ],
      },
      // banner
      {
        code: "test-div-2",
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
          },
        },
        bids: [
          {
            bidder: "discovery",
            params: {
              token: "d0f4902b616cc5c38cbe0a08676d0ed9",
              tagid: 'test_tagid',
              publisher: 'test_publisher'
            },
          },
        ],
      },
    ];
```
