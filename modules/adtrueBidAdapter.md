# Overview

```
Module Name: AdTrue Bid Adapter
Module Type: Bidder Adapter
Maintainer: ssp@adtrue.com
```

# Description

Connects to AdTrue exchange for bids.
AdTrue bid adapter supports Video, Banner currently.

# Test Parameters
```
var adUnits = [
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300,600]]
      }
    },
    bids: [
      {
          bidder: 'adtrue',
          params: {
              zoneId: '6677028', // required, Zone Id provided by AdTrue
              publisherId: '1088', // required, Publisher Id provided by AdTrue  
              reserve: 0.1         // optional  
          }
      }
    ]
  }
];
```

# Video Test Parameters
```
var videoAdUnit = {
  code: 'video-instream',
  sizes: [[640, 480]],
  mediaTypes: {
    video: {
      playerSize: [[640, 480]],
      context: 'instream'
    },
  },
  bids: [
    {
      bidder: 'adtrue',
      params: {
           zoneId: '6677029', // required, Zone Id provided by AdTrue
           publisherId: '1088', // required, Publisher Id provided by AdTrue  
           reserve: 0.1         // optional  
      }
    }
  ]
};
```
