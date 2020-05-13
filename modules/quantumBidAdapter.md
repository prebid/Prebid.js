# Overview

```
Module Name:  Quantum Advertising Bid Adapter
Module Type:  Bidder Adapter
Maintainer: support.mediareporting@adux.com
```

# Description

Connects to Quantum's ssp for bids.

# Sample Ad Unit: For Publishers
```
var adUnits = [{
          code: 'quantum-adUnit-id-1',
          sizes: [[300, 250]],
          bids: [{
              bidder: 'quantum',
              params: {
                placementId: 21546 //quantum adUnit id
              }      
            }]
        },{
          code: 'quantum-native-adUnit-id-1',
          sizes: [[0, 0]],
          mediaTypes: 'native',
          bids: [{
              bidder: 'quantum',
              params: {
                placementId: 21546 //quantum adUnit id
              }      
            }]
        }];
```

# Ad Unit and Setup: For Testing

```
<html>

  <body style="margin:0;padding:0">

    <script>
      var pbjs = eanpbjs = pbjs || {};
      pbjs.que = pbjs.que || [];
      pbjs.logging = true;

      (function() {
        var pbjsEl = document.createElement("script");
        pbjsEl.type = "text/javascript";
        pbjsEl.async = true;
        var isHttps = 'https:' === document.location.protocol;
        pbjsEl.src = "//cdn.elasticad.net/native/serve/js/quantx/quantumPrebidAdapter/prebid.js";
        var pbjsTargetEl = document.getElementsByTagName("head")[0];
        pbjsTargetEl.insertBefore(pbjsEl, pbjsTargetEl.firstChild);
      })();

      var adUnitID = 'pl-100';

      pbjs.que.push(function() {
        var adUnits = [{
          code: adUnitID,
          sizes: [[300, 250]],
          bids: [{
              bidder: 'quantum',
              params: {
                placementId: 21546 //quantum adUnit id
              }      
            }]
        }];

        pbjs.addAdUnits(adUnits);

        pbjs.requestBids({
          timeout: 800,
          bidsBackHandler: function() {    
              var adUnitData = pbjs.getAdserverTargetingForAdUnitCode(adUnitID);
              //console.log('adUnitData', adUnitData);
              if(adUnitData['hb_adid']){
                    var iframe = document.getElementById('placement');
                    var iframeDoc = iframe.contentWindow.document;
                    pbjs.renderAd(iframeDoc, adUnitData['hb_adid']);
              }            
          }
        });
      });

    </script>
    <iframe id='placement' FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true" WIDTH="0" HEIGHT="0"></iframe>
  </body>

</html>
  ```
