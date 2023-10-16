# Overview

```
Module Name: Doceree Bidder Adapter
Module Type: Bidder Adapter
Maintainer: sourbh.gupta@doceree.com
```

<!-- # Description -->
Connects to Doceree demand source to fetch bids.  
Please use ```doceree``` as the bidder code. 


# Test Parameters
```
var adUnits = [
   {
       code: 'doceree',
       sizes: [
          [300, 250]
       ],
       bids: [
           {
               bidder: "doceree",
               params: {
                    placementId: 'DOC_7jm9j5eqkl0xvc5w', //required
                    publisherUrl: document.URL || window.location.href, //optional
                    gdpr: '1', //optional
                    gdprConsent:'CPQfU1jPQfU1jG0AAAENAwCAAAAAAAAAAAAAAAAAAAAA.IGLtV_T9fb2vj-_Z99_tkeYwf95y3p-wzhheMs-8NyZeH_B4Wv2MyvBX4JiQKGRgksjLBAQdtHGlcTQgBwIlViTLMYk2MjzNKJrJEilsbO2dYGD9Pn8HT3ZCY70-vv__7v3ff_3g', //optional
               }
            }
       ]
   }
];
```
