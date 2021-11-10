# Overview

```
Module Name: Codefuel Adapter
Module Type: Bidder Adapter
Maintainer: hayimm@codefuel.com
```

# Description

Module that connects to Codefuel bidder to fetch bids.
Display format is supported but not native format. Using OpenRTB standard.

# Configuration

## Bidder and usersync URLs

The Codefuel adapter does not work without setting the correct bidder.
You will receive the URLs when contacting us.

```
pbjs.setConfig({
    codefuel: {
      bidderUrl: 'https://ai-p-codefuel-ds-rtb-us-east-1-k8s.seccint.com/prebid',
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
            bidder: 'codefuel',
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
        codefuel: {
          bidderUrl: 'https://ai-p-codefuel-ds-rtb-us-east-1-k8s.seccint.com/prebid'
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
            bidder: 'codefuel',
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
        codefuel: {
          bidderUrl: 'https://ai-p-codefuel-ds-rtb-us-east-1-k8s.seccint.com/prebid'
        }
    });
```
