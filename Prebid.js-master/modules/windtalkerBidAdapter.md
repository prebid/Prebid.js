# Overview

**Module Name**: Windtalker Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: corbin@windtalker.io

# Description

Connects to Windtalker demand source to fetch bids.  
Banner, Native, Video formats are supported.  
Please use ```windtalker``` as the bidder code.

# Test Parameters
```
  var adUnits = [{
          code: 'dfp-native-div',
          mediaTypes: {
              native: {
                  title: {
                      required: true,
                      len: 75
                  },
                  image: {
                      required: true
                  },
                  body: {
                      len: 200
                  },
                  icon: {
                      required: false
                  }
              }
          },
          bids: [{
              bidder: 'windtalker',
              params: {
                  pubId: '584971',
                  siteId: '584971',
                  placementId: '123',
                  bidFloor: '0.001', // optional
                  ifa: 'XXX-XXX', // optional
                  latitude: '40.712775', // optional
                  longitude: '-74.005973', // optional
              }
          }]
      },
      {
          code: 'dfp-banner-div',
          mediaTypes: {
              banner: {
                  sizes: [
                      [300, 250],[300,600]
                  ],
              }
          },
          bids: [{
              bidder: 'windtalker',
              params: {
                  pubId: '584971',
                  siteId: '584971',
                  placementId: '123',
              }
          }]
      },
      {
          code: 'dfp-video-div',
          mediaTypes: {
              video: {
                  playerSize: [[640, 480]],
                  context: "instream"
              }
          },
          bids: [{
              bidder: 'windtalker',
              params: {
                  pubId: '584971',
                  siteId: '584971',
                  placementId: '123',
                  video: {
                      skipppable: true,
                  }
              }
          }]
      }
  ];
```
