# Bitmedia Bid Adapter

## Overview

```
Module Name: Bitmedia Bid Adapter  
Module Type: Bidder Adapter  
Maintainer: support@bitmedia.io
```

## Description

The Bitmedia Bid Adapter allows you to integrate BitmediaIO for banner advertising.

### Key Points:
- Supported Media Type: **Banner**
- Bids are only provided in **USD**.
- Access to **local storage** is optional.

Before using this adapter, simply [create a publisher account](https://bitmedia.io/become-a-publisher) on our platform to obtain your `adUnitID`.

More about us: [https://bitmedia.io](https://bitmedia.io)

---

## Test Parameters

### Example
```javascript
var adUnits = [
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]],
      },
    },
    bids: [{
      bidder: 'bitmedia',
      params: {
        adUnitID: 'exampleAdUnitID',
        currency: 'USD',
      },
    }],
  },
];
```

---

## Testing Instructions

The HTML file below can be used to test the integration of the Bitmedia Bid Adapter.

### Simple Test HTML

```html
<!--
  This page runs an auction for 2 adunits, simply displaying the results
  rather than sending targeting to an ad server.

  Notes:

  - this approach assumes that the adunit.code is the div name. There
  are many other ways to match the adunit to the div.
  - this approach won't work for refreshed adunits. For that scenario
  you'll need to be more surgical about what's passed into the bidsbackhandler.
  - there's not a separate failsafe timeout here. Since there's no call to
  an ad server waiting impatiently, Prebid's the only ad game in town and its
  timeout is sufficient.
-->

<html>
<head>
    <!-- Your prebid build with Bitmedia adapter included -->
    <script type="text/javascript" src="Should_Include_Bitmedia_Adapter/prebid.js" async></script>
    <script>
        var adUnits = [
            {
                code: 'test-div',
                mediaTypes: {
                    banner: {
                        sizes: [
                            [300, 600],
                            [300, 250]

                        ]
                    }
                },
                bids: [
                    {
                        bidder: 'bitmedia',
                        params: {
                            adUnitID: 'exampleAdUnitID',
                            currency: 'USD'
                        },
                    },
                ]
            },
            {
                code: 'test-div2',
                mediaTypes: {
                    banner: {
                        sizes: [[320, 100]]
                    }
                },
                bids: [{
                    bidder: 'bitmedia',
                    params: {
                        adUnitID: 'exampleAdUnitID',
                        currency: 'USD'
                    }
                }]
            }
        ];

        var pbjs = pbjs || {};
        pbjs.que = pbjs.que || [];
    </script>
    <!-- Your prebid settings -->
    <script>
        pbjs.que.push(function () {
            pbjs.setConfig({
                debug: true,
            });
            pbjs.bidderSettings = {
                bitmedia: {
                    storageAllowed: true, // recommended
                },
            };
        });
    </script>

    
    
    <script>
        pbjs.que.push(function() {
            pbjs.addAdUnits(adUnits);
        });

        // you could instead pass an array of adUnits
        // to getHighestCpmBids() if desired
        function renderAllAdUnits() {
            var winners=pbjs.getHighestCpmBids();
            for (var i = 0; i < winners.length; i++) {
                renderOne(winners[i]);
            }
        }

        function renderOne(winningBid) {
            if (winningBid && winningBid.adId) {
                var div = document.getElementById(winningBid.adUnitCode);
                if (div) {
                    let iframe = document.createElement('iframe');
                    iframe.frameBorder = '0';
                    div.appendChild(iframe);
                    var iframeDoc = iframe.contentWindow.document;
                    pbjs.renderAd(iframeDoc, winningBid.adId);
                }
            }

        }

    </script>

    <script>
        pbjs.que.push(function() {
            pbjs.requestBids({
                timeout: 2000,
                bidsBackHandler: renderAllAdUnits
            });
        });
    </script>
</head>

<body>
<h2>Ad Serverless Test Page</h2>

<div id='test-div'></div>
<br/>
<div id='test-div2'></div>
</body>
</html>
```