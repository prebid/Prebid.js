# Overview

```
Module Name: SmartyAds Bidder Adapter
Module Type: Bidder Adapter
Maintainer: supply@smartyads.com
```

# Description

Module that connects to SmartyAds' demand sources

# Test Parameters
```
    var adUnits = [
                // Will return static native ad. Assets are stored through user UI for each placement separetly
                {
                    code: 'placementId_0',
                    mediaTypes: {
                        native: {}
                    },
                    bids: [
                        {
                            bidder: 'smartyads',
                            params: {
                                host: 'prebid',
                                sourceid: '0',
                                accountid: '0',
                                traffic: 'native'
                            }
                        }
                    ]
                },
                // Will return static test banner
                {
                    code: 'placementId_0',
                    mediaTypes: {
                        banner: {
                            sizes: [[300, 250]],
                        }
                    },
                    bids: [
                        {
                            bidder: 'smartyads',
                            params: {
                              host: 'prebid',
                                sourceid: '0',
                                accountid: '0',
                                traffic: 'banner'
                            }
                        }
                    ]
                },
                // Will return test vast xml. All video params are stored under placement in publishers UI
                {
                    code: 'placementId_0',
                    mediaTypes: {
                        video: {
                            playerSize: [640, 480],
                            context: 'instream'
                        }
                    },
                    bids: [
                        {
                            bidder: 'smartyads',
                            params: {
                              host: 'prebid',
                                sourceid: '0',
                                accountid: '0',
                                traffic: 'video'
                            }
                        }
                    ]
                }
            ];
```
