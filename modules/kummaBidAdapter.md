# Overview

**Module Name**: Kumma Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: yehonatan@kumma.com  

# Description

Connects to Kumma demand source to fetch bids.  
Banner, Native, Video formats are supported.  
Please use ```kumma``` as the bidder code.

# Test Parameters
```
  var adUnits = [{
          code: 'dfp-native-div',
          mediaType: 'native',
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
              bidder: 'kumma',
              params: {
                  pubId: '29521',
                  siteId: '26047',
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
                      [300, 250]
                  ],
              }
          },
          bids: [{
              bidder: 'kumma',
              params: {
                  pubId: '29521',
                  siteId: '26049',
                  placementId: '123',
              }
          }]
      },
      {
          code: 'dfp-video-div',
          sizes: [640, 480],
          mediaTypes: {
              video: {
                  context: "instream"
              }
          },
          bids: [{
              bidder: 'kumma',
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
