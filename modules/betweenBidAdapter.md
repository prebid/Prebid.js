# Overview

Module Name: Between Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@betweendigital.com

# Description

You can use this adapter to get a bid from betweendigital.

About us : http://betweendigital.com


# Test Parameters
```javascript
    var adUnits = [
        {
            code: 'test-div',
            bids: [
                {
                    bidder: "between",
                    params: {
                        w: 200,
                        h: 400,
                        s: 111
                    }
                }
            ]
        }
    ];
```

Where:

* s - the section id
* code - the id of the iframe tag to which the ads will be rendered

# Example page

```html
<html>
  <head>
    <script src="prebid.js"></script>
      <script>
        var PREBID_TIMEOUT = 700;

        var adUnits = [{
          code: 'example',
          sizes: [[300, 250], [200,400]],
          bids: [{
            bidder: 'between',
            params: {
              w: 240,
              h: 400,
              s: 8
            }
          }]

        }];

        var pbjs = pbjs || {};
        pbjs.que = pbjs.que || [];

      </script>


      <script>
        pbjs.que.push(function() {
          pbjs.setConfig({ userSync: {
                iframeEnabled: true
          }});
          pbjs.addAdUnits(adUnits);
          pbjs.requestBids({
            bidsBackHandler: function(e) {
              if (pbjs.adserverRequestSent) return;
              pbjs.adserverRequestSent = true;

              var params = pbjs.getAdserverTargetingForAdUnitCode("example");
              var iframe = document.getElementById('example');
              var iframeDoc = iframe.contentWindow.document;

              if(params && params['hb_adid']) {
                pbjs.renderAd(iframeDoc, params['hb_adid']);
              }
            }
          });
        });
      </script>
  </head>

  <body>
  <h2>Prebid.js BetweenBidAdapter Test</h2>
  <iframe id="example"></iframe>
  </body>
  </html>
```