# Overview

```
Module Name: LeagueM Bidder Adapter
Module Type: LeagueM Bidder Adapter
Maintainer: prebid@league-m.com
```

# Description

Module that connects to league-m.media demand sources

# Test Parameters
```
var adUnits = [
    {
        code: 'test-banner',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]],
            }
        },
        bids: [
            {
                bidder: 'leagueM',
                params: {
                    env: 'leagueM',
                    pid: 'aa8217e20131c095fe9dba67981040b0',
                    ext: {}
                }
            }
        ]
    },
    {
        code: 'test-video',
        sizes: [ [ 640, 480 ] ],
        mediaTypes: {
            video: {
                playerSize: [640, 480],
                context: 'instream',
                skippable: true
            }
        },
        bids: [{
            bidder: 'leagueM',
            params: {
                env: 'leagueM',
                pid: 'aa8217e20131c095fe9dba67981040b0',
                ext: {}
            }
        }]
    }
];
```
