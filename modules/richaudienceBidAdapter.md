# Overview

```
Module Name: Rich Audience Bidder Adapter
Module Type: Bidder Adapter
Maintainer: cert@richaudience.com
```

# Description

Connects to Rich Audience Marketplace for bids. This adapter supports Display and Video.

The Rich Audience adapter requires setup and approval from the Rich Audience team.
Please reach out to your account manager for more information.

# Test Parameters

## Web - DISPLAY
```
    var adUnits = [
                {
                    code: 'test-div1',
                    sizes: [[300, 250],[300, 600]],
                    bids: [{
                        bidder: 'richaudience',
                        params: {
                            "pid":"ADb1f40rmi",
                            "supplyType":"site",
                            "bidfloor":0.70,
                        }
                    }]
                },
                {
                    code: 'test-div2',
                    sizes: [[728, 90],[970, 250]],
                    bids: [{
                        bidder: 'richaudience',
                        params: {
                            "pid":"ADb1f40rmo",
                            "supplyType":"site",
                            "bidfloor":0.40,
                            "keywords": "key1=value1;key2=value2;key3=value3;"
                        }
                    }]
                }
            ];
```

## Web - VIDEO
```
            var adUnits = [{
              code: 'video1',
              mediaTypes: {
                video: {
                    context: 'outstream',
                    playerSize: [640, 480]
                }
              },

              bids: [{
                bidder: 'richaudience',
                params: {
                  pid: 'OjUW9KhuQV',
                  supplyType: 'site',
                  player: {
                     init: "open",
                     end: "close",
                     skin: "light"
                 }
                }
              }]

            }];
```

## In-app
```
    var adUnits = [
                    {
                        code: 'test-div1',
                        mediaTypes: {
                            banner: {
                                sizes: [[300, 250], [300, 600]]
                            }
                         },
                        bids: [{
                            bidder: 'richaudience',
                            params: {
                                "pid":"ADb1f40rmi",
                                "supplyType":"app",
                                "ifa":"AAAAAAAAA-BBBB-CCCC-1111-222222220000",
                                "bidfloor":0.70,
                            }
                        }]
                    },
                    {
                        code: 'test-div2',
                        sizes: [[728, 90],[970, 250]],
                        },
                        bids: [{
                            bidder: 'richaudience',
                            params: {
                                "pid":"ADb1f40rmo",
                                "supplyType":"app",
                                "ifa":"AAAAAAAAA-BBBB-CCCC-1111-222222220000",
                                "bidfloor":0.40,
                            }
                        }]
                    }
                ];
```

# Configuration
Add the following code to enable user syncing. By default, Prebid.js version 0.34.0+ turns off user syncing through iframes.
Rich Audience strongly recommends enabling user syncing through iframes. Be sure to call `pbjs.setConfig()` only once.

```javascript
pbjs.setConfig({
   userSync: {
     filterSettings: {
         iframe: {
             bidders: '*',
             filter: 'include'
          },
          image: {
             bidders: '*',
             filter: 'include'
          }
     },
     syncsPerBidder: 3,
     syncDelay: 6000,
  }
});
```
