# Overview

Module Name: H12 Media Bidder Adapter
Module Type: Bidder Adapter
Maintainer: contact@h12-media.com

# Description

Module that connects to H12 Media demand source to fetch bids.

# Test Parameters
```
        var adUnits = [
            {
                code: 'div-1',
                mediaTypes: {
                    banner: {
                        sizes: [[300, 250]]
                    }
                },
                bids: [
                    {
                        bidder: "h12media",
                        params: {
                            pubid: '123',
                            sizes: '300x250',
                        }
                    }
                ]
            },{
                code: 'div-2',
                mediaTypes: {
                    banner: {
                        sizes: [[728, 90]]
                    }
                },
                bids: [
                    {
                        bidder: "h12media",
                        params: {
                            pubid: '123',
                            placementid: '321'
                        }
                    }
                ]
            }
        ];
```
