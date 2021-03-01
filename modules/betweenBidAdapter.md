# Overview

Module Name: Between Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@betweendigital.com

# Description

You can use this adapter to get a bid from betweendigital.

About us : [betweenx.com](https://betweenx.com)

More detailed instructions you can be found on [this page](https://cdn.betweendigital.com/prebid_instructions/index.html) .

# Test Parameters

> The parameters are used as an example:
>  s: 3649326 — Between section id; code: ad_slot — id of an iframe element showing prebid ads

```javascript
var adUnits = [
  {
    code: "ad_slot",
    mediaTypes: {
      banner: {
        sizes: [[240, 400]],
      },
    },
    bids: [
      {
        bidder: "between",
        params: {
          s: 3649326,
        },
      },
    ],
  },
];
```

### Multisizes

If you specify several sizes in the AdUnits settings in the **mediaTypes.banner.sizes** field, our SSP server will hold an auction with each size and respond with a bid with the maximum CPM.

For example, your ad-slot supports three sizes: 970x250, 728x90 and 468x60. Then the AdUnits code will look like this:

```javascript
var adUnits = [{
 code: 'ad-slot',
  mediaTypes: {
   banner: {
    sizes: [[970, 250], [728, 90], [468, 60]]
   }
 },
 bids: [
  {
   bidder: 'between',
    params: {
     s: BETWEEN_SECTION_ID,
    }
  }
]
}];
```

### Currency

You can choose in which currency the SSP server will send cpm: 'RUB', 'USD' or 'EUR'. Default is 'RUB'. To do this, in the params field of our adapter you need to add the cur field, which takes one of the values: 'RUB', 'USD' or 'EUR'.

For example, you want CPM to be sent in dollars. Then the code of our adapter settings will look like this:

```javascript
{
 bidder: 'between',
  params: {
   s: 	BETWEEN_SECTION_ID,
   cur: 'USD'
  }
}
```

### GDPR

Also, we support GDPR. To find out how to use GDPR in Prebid you can visit [this page](http://prebid.org/dev-docs/modules/consentManagement.html)


# Example page

```html
<html>
  <head>
    <script src="prebid.js"></script>
    <script>
      var PREBID_TIMEOUT = 700;

      var adUnits = [
        {
          code: "example",
          mediaTypes: {
            banner: {
              sizes: [
                [970, 250],
                [240, 400],
                [728, 90],
              ],
            },
          },
          bids: [
            {
              bidder: "between",
              params: {
                s: 809832,
              },
            },
          ],
        },
      ];

      var pbjs = pbjs || {};
      pbjs.que = pbjs.que || [];
    </script>

    <script>
      pbjs.que.push(function () {
        pbjs.setConfig({
          userSync: {
            iframeEnabled: true,
          },
        });
        pbjs.addAdUnits(adUnits);
        pbjs.requestBids({
          bidsBackHandler: function (e) {
            if (pbjs.adserverRequestSent) return;
            pbjs.adserverRequestSent = true;

            var params = pbjs.getAdserverTargetingForAdUnitCode("example");
            var iframe = document.getElementById("example");
            var iframeDoc = iframe.contentWindow.document;

            if (params && params["hb_adid"]) {
              pbjs.renderAd(iframeDoc, params["hb_adid"]);
            }
          },
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
