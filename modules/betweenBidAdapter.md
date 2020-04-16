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
						code: 'ad_slot',
						mediaTypes: {
                banner: {
                    sizes: [[970, 250], [240, 400], [728, 90]]
                }
            },
            bids: [
                {
                    bidder: "between",
                    params: {
                        s: 122938
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
					mediaTypes: {
                banner: {
                    sizes: [[970, 250], [240, 400], [728, 90]]
                }
          },
          bids: [{
            bidder: 'between',
            params: {
              s: 809832
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