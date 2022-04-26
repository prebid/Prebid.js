# Overview

**Module Name**: Platform.io Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: siarhei.kasukhin@platform.io  

# Description

Connects to Platform.io demand source to fetch bids.  
Banner, Native, Video formats are supported.  
Please use ```platformio``` as the bidder code.

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
              bidder: 'platformio',
              params: {
                  pubId: '29521',
                  siteId: '26048',
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
              bidder: 'platformio',
              params: {
                  pubId: '29521',
                  siteId: '26049',
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
              bidder: 'platformio',
              params: {
                  pubId: '29521',
                  siteId: '26049',
                  placementId: '123',
                  video: {
                      skipppable: true,
                  }
              }
          }]
      }
  ];
```
