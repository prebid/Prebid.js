# Overview

```
Module Name: Adfinity Bidder Adapter
Module Type: Bidder Adapter
Maintainer: adfinity_prebid@i.ua
```

# Description

Module that connects to Adfinity demand sources

# Test Parameters
```
    var adUnits = [
                {
                    code: 'placementid_0',
                    mediaTypes: {
                        banner: {
                            sizes: [[300, 250], [300,600]]
                        }
                    },
                    bids: [{
                            bidder: 'adfinity',
                            params: {
                                placement_id: 0,
                                traffic: 'banner'
                            }
                        }
                    ]
                },
                {
                    code: 'placementid_0',
                    mediaTypes: {
                        native: {
                            
                        }
                    },
                    bids: [
                        {
                            bidder: 'adfinity',
                            params: {
                                placement_id: 0,
                                traffic: 'native'
                            }
                        }
                    ]
                },
                {
                    code: 'placementid_0',
                    mediaTypes: {
                        video: {
                            sizes: [[300, 250], [300,600]]
                        }
                    },
                    bids: [
                        {
                            bidder: 'adfinity',
                            params: {
                                placement_id: 0,
                                traffic: 'video'
                            }
                        }
                    ]
                }
            ];
```