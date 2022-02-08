# Overview

```
Module Name: Outbrain Adapter
Module Type: Bidder Adapter
Maintainer: prog-ops-team@outbrain.com
```

# Description

Module that connects to Outbrain bidder to fetch bids.
Both native and display formats are supported but not at the same time. Using OpenRTB standard.

# Configuration

## Bidder and usersync URLs

The Outbrain adapter does not work without setting the correct bidder and usersync URLs.
You will receive the URLs when contacting us.

```
pbjs.setConfig({
    outbrain: {
      bidderUrl: 'https://bidder-url.com',
      usersyncUrl: 'https://usersync-url.com'
    }
});
```


# Test Native Parameters
```
    var adUnits = [
        code: '/19968336/prebid_native_example_1',
        mediaTypes: {
            native: {
                image: {
                    required: false,
                    sizes: [100, 50]
                },
                title: {
                    required: false,
                    len: 140
                },
                sponsoredBy: {
                    required: false
                },
                clickUrl: {
                    required: false
                },
                body: {
                    required: false
                },
                icon: {
                    required: false,
                    sizes: [50, 50]
                }
            }
        },
        bids: [{
            bidder: 'outbrain',
            params: {
                publisher: {
                  id: '2706', // required
                  name: 'Publishers Name',
                  domain: 'publisher.com'
                },
                tagid: 'tag-id',
                bcat: ['IAB1-1'],
                badv: ['example.com']
            }
        }]
    ];

    pbjs.setConfig({
        outbrain: {
          bidderUrl: 'https://prebidtest.zemanta.com/api/bidder/prebidtest/bid/'
        }
    });
```

# Test Display Parameters
```
    var adUnits = [
        code: '/19968336/prebid_display_example_1',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        bids: [{
            bidder: 'outbrain',
            params: {
                publisher: {
                  id: '2706', // required
                  name: 'Publishers Name',
                  domain: 'publisher.com'
                },
                tagid: 'tag-id',
                bcat: ['IAB1-1'],
                badv: ['example.com']
            },
        }]
    ];

    pbjs.setConfig({
        outbrain: {
          bidderUrl: 'https://prebidtest.zemanta.com/api/bidder/prebidtest/bid/'
        }
    });
```
