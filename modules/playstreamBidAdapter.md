# Overview

```
Module Name: Playstream Bidder Adapter
Module Type: Bidder Adapter
Maintainer: kush@adsolut.in
```

# Description

Module that connects to Playstream demand sources

# Test Parameters for banner
```
var adUnits = [{
    code: 'pokluijh-polk-polk-pokl-pokluijhytfg',
    mediaTypes: {
        banner: {
            sizes: [[300, 250], [728, 90]]
        }
    },
    bids: [{
        bidder: 'playstream',
        params: {
            host: 'exchange-9qao.ortb.net',
            adUnitId: '697871ac0ec1c6100e1f9121',
            publisherId: '697871ac0ec1c6100e1f9122',
            type: 'banner',
            ip: '127.0.0.1',
            latitude: 23.21,
            longitude: -23.21,
            maxSlotPerPod: 3,
            maxAdDuration: 120,
            gdpr: 0,
            consent: ''
        }
    }]
}];
```

# Test Parameters for video
```
var videoAdUnit = [{
    code: 'poiuytre-lkjh-gfds-mnbv-lkjhfgsdxcbv',
    mediaTypes: {
        video: {
            playerSize: [640, 360],
            context: 'instream'
        }
    },
    sizes: [640, 360],
    bids: [{
        bidder: 'playstream',
        params: {
            host: 'exchange-9qao.ortb.net',
            adUnitId: '697871ac0ec1c6100e1f9121',
            publisherId: '697871ac0ec1c6100e1f9122',
            type: 'video',
            ip: '127.0.0.1',
            latitude: 23.21,
            longitude: -23.21,
            maxSlotPerPod: 3,
            maxAdDuration: 120,
            gdpr: 0,
            consent: ''
        }
    }]
}];
```
