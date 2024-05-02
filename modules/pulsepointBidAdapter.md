# Overview

**Module Name**: PulsePoint Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: ExchangeTeam@pulsepoint.com

# Description

Connects to PulsePoint demand source to fetch bids.  
Banner, Video and Native formats are supported.  
Please use ```pulsepoint``` as the bidder code.
```pulseLite``` and ```pulsepointLite``` aliases also supported as well.

# Test Parameters
```
    var adUnits = [{
      code: 'banner-ad-div',
      sizes: [[300, 250]],
      bids: [{
          bidder: 'pulsepoint',
          params: {
              cp: 512379,
              ct: 486653
          }
      }]
    },{
        code: 'native-1-slot',
        mediaTypes: {
             native: {
                   ortb: {
                   assets: [{
                      id: 1,
                      required: 1,
                          img: {
                               type: 3,
                               w: 150,
                               h: 50,
                          }
                     },
                     {
                     id: 2,
                     required: 1,
                     title: {
                         len: 80
                      }
                },
                {
                     id: 3,
                     required: 1,
                     data: {
                       type: 1
                     }
                }]
               }
            }
        },
        bids: [{
            bidder: 'pulsepoint',
            params: {
                cp: 512379,
                ct: 694973
            }
        }]
    },{
        code: 'instream',
        mediaTypes: {
            video: {
                playerSize: [640, 480],
                context: 'instream',
                h: 300,
                w: 400,
                minduration: 1,
                maxduration: 210,
                protocols: [2,3,5]
            }
        },
        bids: [{
            bidder: 'pulsepoint',
            params: {
                cp: 512379,
                ct: 694973, 
            }
        }]
    }];
```
