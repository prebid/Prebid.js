# Overview

Module Name: Custom Bidder Adapter
Module Type: Bidder Adapter
Maintainer: dev@pubstack.io

# Description

Module that connects allow Publishers custom requests/responses

# Test Parameters
```
 const adUnits = {
      code: 'adunit-div-1',
      mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
      bids: [{
        bidder: 'my_adserver',
      }],
    };

    pbjs.setConfig({ debug: true });
    pbjs.aliasBidder('customBidAdapter', 'my_adserver');
    pbjs.bidderSettings = {
      my_adserver: {
        handlers: {
          // Foward requests to the interpretResponse handler
          buildRequests: requests => [{
            method: 'PROMISE',
            promise: new Promise(resolve => setTimeout(() => resolve(requests), 500)),
          }],
          // Transform requests into simple responses
          interpretResponse: requests => requests.map(r => ({
            ad: 'creative: ' + r.bidId,
            creativeId: 'creativeId-42_1337',
            cpm: Math.random() * 3,
            width: 300,
            height: 250,
            requestId: r.bidId,
            currency: 'USD',
            netRevenue: true,
            ttl: 360,
          })),
        },
      },
    };
    pbjs.addAdUnits(adUnits);
    pbjs.requestBids({
      bidsBackHandler: (responses) => {
        Object.keys(responses).forEach(adUnit => {
          const ads = pbjs.getHighestCpmBids(adUnit);
          const iframe = document.createElement('iframe');
          document.body.appendChild(iframe);
          ads.forEach(ad => pbjs.renderAd(iframe.contentWindow.document, ad.adId));
        });
      },
      timeout: 3000,
    });   
```
