# Overview

**Module Name**: Adxcg Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: info@adxcg.com

# Description

Module that connects to an Adxcg.com zone to fetch bids.

# Test Parameters

```



        var adUnits = [{
                    code: 'banner-ad-div',
                    mediaTypes: {
                        banner: {
                            sizes: [
                                [300, 250],
                                [300, 600]
                            ]
                        }
                    },
                    bids: [{
                        bidder: 'adxcg',
                        params: {
                            adzoneid: '1'
                        }
                    }]
                }, {
                    code: 'native-ad-div',
                    mediaTypes: {
                        native: {
                            image: {
                                sendId: false,
                                required: true,
                                sizes: [80, 80]
                            },
                            icon: {
                                sendId: true,
                            },
                            brand: {
                                sendId: true,
                            },
                            title: {
                                sendId: false,
                                required: true,
                                len: 75
                            },
                            body: {
                                sendId: false,
                                required: true,
                                len: 200
                            },
                            sponsoredBy: {
                                sendId: false,
                                required: false,
                                len: 20
                            }
                        }
                    },
                    bids: [{
                            bidder: 'adxcg',
                            params: {
                                adzoneid: '2379'
                            }                        
                    }]
            },
            {
                code: 'video-div',
                mediaTypes: {
                    video: {
                        playerSize: [640, 480],
                        context: 'instream',
                        mimes: ['video/mp4'],
                        protocols: [5, 6, 8],
                        playback_method: ['auto_play_sound_off']
                    }
                },
                bids: [{
                    bidder: 'adxcg',
                    params: {
                        adzoneid: '20',
                        video: {
                            maxduration: 100,
                            skippable: true
                        }
                    }
                }]
            }
        ];

```
