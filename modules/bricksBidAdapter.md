# Overview

```
Module Name:  Bricks Bid Adapter
Module Type:  Bidder Adapter
Maintainer: g.veyssie@viously.com
```

# Description

Connects to Bricks exchange for bids.

The Bricks bid adapter supports Banner ands Video (instream and outstream) types.

# Test Parameters

Video params :
```
var adUnits = [{
    mediaTypes: {
        video: {
            context: 'instream',
            playerSize: [640, 480],
            mimes: ["video/mp4"],
            skippable: true,
            playback_method: ["auto_play_sound_on", "auto_play_sound_off", "click_to_play", "auto_play_sound_unknown"],
            protocols: [1, 2, 3, 4, 5, 6, 7, 8],
            minduration: 5,
            maxduration: 120,
            api: [1, 2],
            skip: true,
            startdelay: 0,
            placement: 1,
            linearity: 1
        }
    }
}];
```

Banner params :
```
var adUnits = [{
    mediaTypes: {
        video: {
            size: [600, 50],
            pos: '1'
        }
    }
}];
```

Bidder params :
```
{
bidder: "bricks",
    params: {
        account: 'test',
        id: '1234',
        blocklist: [
            'addomain.com',
            'addomain2.com'
        ]
    }
}
```
