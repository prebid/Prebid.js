# Overview
Module Name: Opt Out Advertising Bidder Adapter Module 
Type: Bidder Adapter 
Maintainer: rob@optoutadvertising.com

# Description
Opt Out Advertising Bidder Adapter for Prebid.js.

# Test Parameters
```
var adUnits = [
{
    code: 'test-div',
    sizes: [[300, 250]],
    bids: [
        {
             bidder: 'optout',
             params: {
                 publisher: '8',
                 adslot: 'prebid_demo',
             }
        }
    ]
}
];
```

