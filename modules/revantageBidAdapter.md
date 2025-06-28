# Overview

```
Module Name: ReVantage Bidder Adapter
Module Type: ReVantage Bidder Adapter
Maintainer: prebid@revantage.io
```

# Description

Connects to ReVantage exchange for bids.
ReVantage bid adapter supports Banner only.

# Test Parameters
```
    var adUnits = [
                // Will return static test banner
                {
                    code: 'adunit',
                    mediaTypes: {
                        banner: {
                            sizes: [ [300, 250], [320, 50] ],
                        }
                    },
                    bids: [
                        {
                            bidder: 'revantage',
                            params: {
                                feedId: 'testfeed',
                            }
                        }
                    ]
                }
```
