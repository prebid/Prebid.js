# Overview

```
Module Name: Fyber Bidder Adapter
Module Type: Bidder Adapter
Maintainer: uri@inner-active.com
```

# Description

Module that connects to Fyber's demand sources

# Test Parameters
```
var adUnits = [
{
code: 'test-div',
mediaTypes: {
banner: {
sizes: [[300, 250]],  // a display rectangle size
}
},
bids: [
{
bidder: 'fyber',
    params: {
        APP_ID: 'MyCompany_MyApp',
        spotType: 'rectangle',
        customParams: {
            portal: 7002
        }
    }
}
]
},{
code: 'test-div',
mediaTypes: {
banner: {
sizes: [[320, 50]],   // a banner size
}
},
bids: [
{
bidder: 'fyber',
    params: {
        APP_ID: 'MyCompany_MyApp',
        spotType: 'banner',
        customParams: {
            portal: 7001
        }
    }
}
]
}
];
```
