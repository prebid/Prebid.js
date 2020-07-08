# Overview

```
Module Name: Inmar Bidder Adapter
Module Type: Bidder Adapter
Maintainer: oiq_rtb@inmar.com
```

# Description

Connects to Inmar for bids. This adapter supports Display and Video.

The Inmar adapter requires setup and approval from the Inmar team.
Please reach out to your account manager for more information.

# Test Parameters

## Web
```
    var adUnits = [
                {
                    code: 'test-div1',
                    sizes: [[300, 250],[300, 600]],
                    bids: [{
                        bidder: 'inmar',
                        params: {
                            "pid":"ADb1f40rmi",
                            "supplyType":"site",
                            "bidfloor":0.70,
                        }
                    }]
                },
                {
                    code: 'test-div2',
                    sizes: [[728, 90],[970, 250]],
                    bids: [{
                        bidder: 'inmar',
                        params: {
                            "pid":"ADb1f40rmo",
                            "supplyType":"site",
                            "bidfloor":0.40,
                        }
                    }]
                }
            ];
```

## In-app
```
    var adUnits = [
                    {
                        code: 'test-div1',
                        mediaTypes: {
                            banner: {
                                sizes: [[300, 250], [300, 600]]
                            }
                         },
                        bids: [{
                            bidder: 'inmar',
                            params: {
                                "pid":"ADb1f40rmi",
                                "supplyType":"app",
                                "ifa":"AAAAAAAAA-BBBB-CCCC-1111-222222220000",
                                "bidfloor":0.70,
                            }
                        }]
                    },
                    {
                        code: 'test-div2',
                        sizes: [[728, 90],[970, 250]],
                        },
                        bids: [{
                            bidder: 'inmar',
                            params: {
                                "pid":"ADb1f40rmo",
                                "supplyType":"app",
                                "ifa":"AAAAAAAAA-BBBB-CCCC-1111-222222220000",
                                "bidfloor":0.40,
                            }
                        }]
                    }
                ];
```
