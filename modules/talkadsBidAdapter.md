# Overview

```
Module Name: TalkAds Adapter
Module Type: Bidder Adapter
Maintainer: technical_team@natexo.com
```

# Description

Module that connects to TalkAds bidder to fetch bids.
Both native and banner formats are supported but not at the same time.
The only currently supported currency is EUR.

This adapter requires setup and approval from the Natexo programmatic team.

# Configuration




# Test parameters

## Test banner Parameters

```
    var adUnits = [
        code: 'prebid_banner_test',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300, 600]],
            }
        },
        bids: [{
            bidder: 'talkads',
            params: {
                tag_id: 0,
                bidder_url: 'https://d.natexo-programmatic.com/tad/tag/testbid',
            },
        }]
    ];
```

## Test native parameters

```
    var adUnits = [
        code: 'prebid_native_test',
        mediaTypes: {
            native: {}
        },
        bids: [{
            bidder: 'talkads',
            params: {
                tag_id: 0,
                bidder_url: 'https://d.natexo-programmatic.com/tad/tag/testbid',
            },
        }]
    ];
```
