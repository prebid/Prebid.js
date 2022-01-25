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
                                required: false,
                                sizes: [127, 83]
                            },
                            icon: {
                                sizes: [80, 80],
                                required: false,
                                sendId: true,
                            },
                            title: {
                                sendId: false,
                                required: false,
                                len: 75
                            },
                            body: {
                                sendId: false,
                                required: false,
                                len: 200
                            },
                            cta: {
                                sendId: false,
                                required: false,
                                len: 75
                            },
                            sponsoredBy: {
                                sendId: false,
                                required: false
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
                            protocols: [2, 3, 5, 6, 8],
                            playback_method: ['auto_play_sound_off'],
			                maxduration: 100,
                            skip: 1
                        }
                },
                bids: [{
                    bidder: 'adxcg',
                    params: {
                        adzoneid: '20'                       
                    }
                }]
            }
        ];

```
