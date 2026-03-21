# Overview

```
Module Name: MediaForce Bidder Adapter
Module Type: Bidder Adapter
Maintainer: little.grey.goblin@gmail.com
```

# Description

Module that connects to mediaforce's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],
                }
            },
            bids: [
                {
                    bidder: "mediaforce",
                    params: {
                        placement_id: 'pl12345',  // required
                        publisher_id: 'pub12345', // required
                        bidfloor: 0.5,
                    }
                }
            ]
        }
    ];
```

```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                native: {
                    title: {
                        required: true,
                        len: 800
                    },
                    image: {
                        required: true,
                        sizes: [420, 315],
                    },
                    sponsoredBy: {
                        required: false
                    }
                }
            },
            bids: [
                {
                    bidder: "mediaforce",
                    params: {
                        placement_id: 'pl12345',  // required
                        publisher_id: 'pub111', // required
                        is_test: true
                    }
                }
            ]
        }
    ];
```

```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                video: {
                    playerSize: [640, 480],
                    context: 'instream',
                    mimes: ['video/mp4', 'video/webm'],
                    protocols: [2, 3, 5, 6],
                    skip: 0,
                    playbackmethod: [2],
                    api: [2]
                }
            },
            bids: [
                {
                    bidder: 'mediaforce',
                    params: {
                        placement_id: 'pl67890',   // required
                        publisher_id: 'pub67890',  // required
                        bidfloor: 1.0
                    }
                }
            ]
        }
    ];
```
