# Overview

**Module Name**: Improve Digital Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: hb@azerion.com

# Description

Module that connects to Improve Digital's demand sources

# Test Parameters
```
            var adUnits = [{
                code: 'div-gpt-ad-1499748733608-0',
                sizes: [[600, 290]],
                bids: [
                    {
                        bidder: 'improvedigital',
                        params: {
                            placementId:1053688
                        }
                    }
                ]
            }, {
                code: 'div-gpt-ad-1499748833901-0',
                sizes: [[250, 250]],
                bids: [{
                    bidder: 'improvedigital',
                    params: {
                        placementId:1053689,
                        keyValues: {
                            testKey: ["testValue"]
                        }
                    }
                }]
            }, {
                code: 'div-gpt-ad-1499748913322-0',
                sizes: [[300, 300]],
                bids: [{
                    bidder: 'improvedigital',
                    params: {
                        placementId:1053687,
                        size: {
                            w:300,
                            h:300
                        }
                    }
                }]
            }];
```