# Overview

```
Module Name: Smaato Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@smaato.com
```

# Description

The Smaato adapter requires setup and approval from the Smaato team, even for existing Smaato publishers. Please reach out to your account team or prebid@smaato.com for more information.

# Test Parameters

For banner adunits:

```
var adUnits = [{
    "code": "banner-unit",
    "mediaTypes": {
        "banner": {
            "sizes": [320, 50]
        }
    },
    "bids": [{
        "bidder": "smaato",
        "params": {
            "publisherId": "1100042525",
            "adspaceId": "130563103"
        }
    }]
}];
```

For video adunits:

```
var adUnits = [{
    "code": "video unit",
    "mediaTypes": {
        "video": {
            "context": "instream",
            "playerSize": [640, 480],
            "mimes": ["video/mp4"],
            "minduration": 5,
            "maxduration": 30,
            "startdelay": 0,
            "linearity": 1,
            "protocols": [7],
            "skip": 1,
            "skipmin": 5,
            "api": [7],
            "ext": {"rewarded": 0}
        }
    },
    "bids": [{
        "bidder": "smaato",
        "params": {
            "publisherId": "1100042525",
            "adspaceId": "130563103"
        }
    }]
}];
```

For adpod adunits:

```
var adUnits = [{
    "code": "adpod unit",
    "mediaTypes": {
        "video": {
            "context": "adpod",
            "playerSize": [640, 480],
            "adPodDurationSec": 300,
            "durationRangeSec": [15, 30],
            "requireExactDuration": false,
            "mimes": ["video/mp4"],
            "startdelay": 0,
            "linearity": 1,
            "protocols": [7],
            "skip": 1,
            "skipmin": 5,
            "api": [7],
        }
    },
    "bids": [{
        "bidder": "smaato",
        "params": {
            "publisherId": "1100042525",
            "adbreakId": "330563103"
        }
    }]
}];
```
