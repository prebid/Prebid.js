# Overview

```
Module Name:  JWPlayer Bid Adapter
Module Type:  Bidder Adapter
Maintainer: boost-engineering@jwplayer.com
```

# Description

Connects to JWPlayer's demand sources.

JWPlayer bid adapter supports Video (instream and outstream).

# Sample Ad Unit

```markdown
const adUnit = {
    code: 'test-ad-unit',
    mediaTypes: {
    video: {
        pos: 0,
        w: 640,
        h: 480,
        mimes :  ['video/x-ms-wmv', 'video/mp4'],
        minduration : 0,
        maxduration: 60,
        protocols : [2,3,7,5,6,8],
        startdelay: 0,
        placement: 1,
        plcmt: 1,
        skip: 1,
        skipafter: 10,
        playbackmethod: [3],
        api: [2],
        linearity: 1
    }
    },
    bids: [{
        bidder: 'jwplayer',
        params: {
            publisherId: 'test-publisher-id',
            siteId: 'test-site-id',
            placementId: 'test-placement-id'
        }
    }]
};
```

# Sample ortb2 config

```markdown
pbjs.setConfig({
    ortb2: {
        site: {
            publisher: {
                id: 'test-publisher-id'
            },
            content: {
                id: 'test-media-id',
                url: 'test.mp4',
                title: 'title of my media',
                ext: {
                    description: 'description of my media'
                }
            },
            domain: 'test-domain.com',
            page: 'https://www.test-domain.com/test.html',
        }
    }
}
```
