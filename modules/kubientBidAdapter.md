# Overview
​
**Module Name**: Kubient Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**:  artem.aleksashkin@kubient.com
​
# Description
​
Connects to Kubient KSSP demand source to fetch bids. Banners and Video supported
​
# Banner Test Parameters
```
var adUnits = [
    {
        code: 'banner-ad-unit',
        mediaTypes: {
            banner: {
                sizes: [[300, 100]]
            }
        },
        bids: [{
            bidder: 'kubient',
            params: {
                zoneid: "5fbb948f1e22b",
            }
        }]
    }
];
​
# Video Test Parameters
​
var adUnits = [
    {
        code: 'video-ad-unit',
        mediaTypes: {
            video: {
                playerSize: [300, 250],               // required
                context: 'instream',                  // required
                mimes: ['video/mp4','video/x-flv'],   // required
                protocols: [ 2, 3 ],                  // required, set at least 1 value in array
                placement: 1,                         // optional, defaults to 2 when context = outstream
                api: [ 1, 2 ],                        // optional
                skip: 0,                              // optional
                minduration: 5,                       // optional
                maxduration: 30,                      // optional
                playbackmethod: [1,3],                // optional
                battr: [ 13, 14 ],                    // optional
                linearity: 1,                         // optional
                minbitrate: 10,                       // optional
                maxbitrate: 10                        // optional
            }
        },
        bids: [{
            bidder: 'kubient',
            params: {
                zoneid: "60ad1c0b35864",
            }
        }]
    }
];
```
