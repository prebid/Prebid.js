# Overview

```
Module Name: Afront SSP Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@afront.io
```

# Description

Module that connects to Afront DSP demand sources

# Test Parameters

```json
    var adUnits = [{
                code: 'placementId',
                      mediaTypes: {
                          banner: {
                              sizes: [[300, 250], [300,600]]
                              }
                              },
                bids: [{
                        bidder: 'afront',
                        params: {
                            placementId: 'hash',
                            accountId: 'accountId'
                        }
                    }]
                },
                {
                    code: 'native_example',
                    // sizes: [[1, 1]],
                    mediaTypes: {
                      native: {
                        title: {
                          required: true,
                          len: 800
                        },
                        image: {
                          required: true,
                            len: 80
                        },
                        sponsoredBy: {
                            required: true
                        },
                        clickUrl: {
                            required: true
                        },
                        privacyLink: {
                            required: false
                        },
                        body: {
                            required: true
                        },
                        icon: {
                            required: true,
                            sizes: [50, 50]
                        }
                    }

                    },
                    bids: [
                        {
                            bidder: 'afront',
                            params: {
                                placementId: 'hash',
                                accountId: 'accountId'
                            }
                        }
                        ]
                },
                {
                    code: 'video1',
                    sizes: [640,480],
                    mediaTypes: {
                        video: {
                            minduration:0,
                            maxduration:999,
                            boxingallowed:1,
                            skip:0,
                            mimes:[
                                'application/javascript',
                                'video/mp4'
                            ],
                            w:1920,
                            h:1080,
                            protocols:[
                                2
                            ],
                            linearity:1,
                            api:[
                                1,
                                2
                            ]
                        }
                    },
                    bids: [
                        {
                            bidder: 'afront',
                            params: {
                                placementId: 'hash',
                                accountId: 'accountId'
                            }
                        }
                    ]
                }
            ];
```
