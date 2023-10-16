# Overview

```
Module Name: Yieldlab Bidder Adapter
Module Type: Bidder Adapter
Maintainer: solutions@yieldlab.de
```

# Description

Module that connects to Yieldlab's demand sources

# Test Parameters

```javascript
const adUnits = [
    {
        code: 'banner',
        sizes: [ [ 728, 90 ] ],
        bids: [{
            bidder: 'yieldlab',
            params: {
                adslotId: '5220336',
                supplyId: '1381604',
                targeting: {
                    key1: 'value1',
                    key2: 'value2'
                },
                extId: 'abc',
                iabContent: {
                    id: 'some_id',
                    episode: '1',
                    title: 'some title',
                    series: 'some series',
                    season: 's1',
                    artist: 'John Doe',
                    genre: 'some genre',
                    isrc: 'CC-XXX-YY-NNNNN',
                    url: 'http://foo_url.de',
                    cat: [ 'IAB1-1', 'IAB1-2', 'IAB2-10' ],
                    context: '7',
                    keywords: ['k1', 'k2'],
                    live: '0'
                }
            }
        }]
    },
    {
        code: 'video',
        sizes: [ [ 640, 480 ] ],
        mediaTypes: {
            video: {
                context: 'instream' // or 'outstream'
            }
        },
        bids: [{
            bidder: 'yieldlab',
            params: {
                adslotId: '5220339',
                supplyId: '1381604'
            }
        }]
    },
    {
        code: 'native',
        mediaTypes: {
            native: {
                // native config
            }
        },
        bids: [{
            bidder: 'yieldlab',
            params: {
                adslotId: '5220339',
                supplyId: '1381604'
            }
        }]
    }
];
```

# Multi-Format Setup

A general overview of how to set up multi-format ads can be found in the offical Prebid.js docs. See: [show multi-format ads](https://docs.prebid.org/dev-docs/show-multi-format-ads.html)

When setting up multi-format ads with Yieldlab make sure to always add at least one eligible Adslot per given media type in the ad unit configuration.

```javascript
const adUnit = {
    code: 'multi-format-adslot',
    mediaTypes: {
        banner: {
            sizes: [ [ 728, 90 ] ]
        },
        native: {
            // native config
        }
    },
    bids: [
        // banner Adslot
        { bidder: 'yieldlab', params: { adslotId: '1234', supplyId: '42' } },
        // native Adslot
        { bidder: 'yieldlab', params: { adslotId: '2345', supplyId: '42' } }
    ]
};
```
