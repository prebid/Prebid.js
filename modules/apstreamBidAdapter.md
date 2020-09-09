# Overview

```
Module Name: AP Stream Bidder Adapter
Module Type: Bidder Adapter
Maintainer: tech@audienceproject.com
gdpr_supported: true
tcf2_supported: true
```

# Description

Module that connects to AP Stream source

# Inherit from prebid.js
```
    var adUnits = [
      {
        code: '/19968336/header-bid-tag-1',
        mediaTypes: { // mandatory and should be only one
            banner: {
                sizes: [[920,180], [920, 130]]
            }
        },
        bids: [{
            bidder: 'apstream',
            params: {
                publisherId: STREAM_PIBLISHER_ID // mandatory
            }
        }]
      }
    ];
```

# Explicit ad-unit code
```
    var website = null;
    switch (location.hostname) { 
      case "site1.com": 
        website = "S1"; 
        break;
      case "site2.com":
        website = "S2";
        break;
    }
    
    var adUnits = [
      {
        code: '/19968336/header-bid-tag-1',
        mediaTypes: { // mandatory and should be only one
            banner: {
                sizes: [[920,180], [920, 130]]
            }
        },
        bids: [{
            bidder: 'apstream',
            params: {
                publisherId: STREAM_PIBLISHER_ID, // mandatory
                code: website + '_Leaderboard'
            }
        }]
      }
    ];
```

# Explicit ad-unit ID
```
    var adUnits = [
      {
        code: '/19968336/header-bid-tag-1',
        mediaTypes: { // mandatory and should be only one
            banner: {
                sizes: [[920,180], [920, 130]]
            }
        },
        bids: [{
            bidder: 'apstream',
            params: {
                publisherId: STREAM_PIBLISHER_ID, // mandatory
                adunitId: 1234
            }
        }]
      }
    ];
```

# DSU

To disable DSU use config option:

```
    pbjs.setConfig({
        apstream: {
            noDsu: true
        }
    });
```

To set `test` and `publisherId` parameters globally use config options (it can be overrided if set in specific bid):

```
pbjs.setBidderConfig({
    bidders: ["apstream"],
    config: {
        appstream: {
            publisherId: '1234
            test: true
        }
    }
});
```
