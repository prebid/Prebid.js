# Overview

**Module Name**: Improve Digital Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: hb@improvedigital.com

# Description

Module that connects to Improve Digital's demand sources

# Test Parameters
```
            var adUnits = [{
                code: 'div-gpt-ad-1499748733608-0',
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