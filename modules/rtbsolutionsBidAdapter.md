# Overview

Module Name: Rtbsolutions Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@rtbsolutions.pro

# Description

You can use this adapter to get a bid from rtbsolutions.

About us: http://rtbsolutions.pro


# Test Parameters
```javascript
    var adUnits = [
                {
                    code: '/19968336/header-bid-tag-1',
                    mediaTypes: {
                        banner: {
                            sizes: sizes
                        }
                    },
                    bids: [{
                        bidder: 'rtbsolutions',
                        params: {
                            blockId: 777,
                            s1: 'sub_1',
                            s2: 'sub_2',
                            s3: 'sub_3',
                            s4: 'sub_4'
                        }
                    }]
                }];
```

Where:

* blockId - Block ID from platform (required)
* s1..s4 - Sub Id (optional)

# Example page

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Prebid</title>
    <script async src="//www.googletagservices.com/tag/js/gpt.js"></script>
    <script async src="prebid.js"></script>
    <script>
        var sizes = [
            [640, 480]
        ];
        var PREBID_TIMEOUT = 1000;
        var FAILSAFE_TIMEOUT = 3000;

        var adUnits = [
            {
                code: '/19968336/header-bid-tag-1',
                mediaTypes: {
                    banner: {
                        sizes: sizes
                    }
                },
                bids: [{
                    bidder: 'rtbsolutions',
                    params: {
                        blockId: 777
                    }
                }]
            }];

        // ======== DO NOT EDIT BELOW THIS LINE =========== //
        var googletag = googletag || {};
        googletag.cmd = googletag.cmd || [];
        googletag.cmd.push(function() {
            googletag.pubads().disableInitialLoad();
        });

        var pbjs = pbjs || {};
        pbjs.que = pbjs.que || [];

        pbjs.que.push(function() {
            pbjs.addAdUnits(adUnits);
            pbjs.requestBids({
                bidsBackHandler: initAdserver,
                timeout: PREBID_TIMEOUT
            });
        });

        function initAdserver() {
            if (pbjs.initAdserverSet) return;
            pbjs.initAdserverSet = true;
            googletag.cmd.push(function() {
                pbjs.setTargetingForGPTAsync && pbjs.setTargetingForGPTAsync();
                googletag.pubads().refresh();
            });
        }

        // in case PBJS doesn't load
        setTimeout(function() {
            initAdserver();
        }, FAILSAFE_TIMEOUT);

        googletag.cmd.push(function() {
            googletag.defineSlot('/19968336/header-bid-tag-1', sizes, 'div-1')
                    .addService(googletag.pubads());
            googletag.pubads().enableSingleRequest();
            googletag.enableServices();
        });

    </script>
</head>
<body>
    <h1>Prebid</h1>
    <h5>Div-1</h5>
    <div id='div-1'>
        <script type='text/javascript'>
            googletag.cmd.push(function() {
                googletag.display('div-1');
            });
        </script>
    </div>
</body>
</html>
```
