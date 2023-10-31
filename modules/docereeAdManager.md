# Overview

```
Module Name: Doceree AdManager Adapter
Module Type: Bidder Adapter
Maintainer: tech.stack@doceree.com
```

<!-- # Description -->

Connects to Doceree demand source to fetch bids.  
Please use `docereeAdManager` as the bidder code.

# Test Parameters

```
var adUnits = [
   {
       code: 'DOC-397-1',
       sizes: [
          [300, 250]
       ],
       bids: [
           {
               bidder: "docereeAdManager",
               params: {
                    placementId: 'DOC-500-3', //required
                    publisherUrl: document.URL || window.location.href, //optional
                    gdpr: '1', //optional
                    gdprConsent:'CPQfU1jPQfU1jG0AAAENAwCAAAAAAAAAAAAAAAAAAAAA.IGLtV_T9fb2vj-_Z99_tkeYwf95y3p-wzhheMs-8NyZeH_B4Wv2MyvBX4JiQKGRgksjLBAQdtHGlcTQgBwIlViTLMYk2MjzNKJrJEilsbO2dYGD9Pn8HT3ZCY70-vv__7v3ff_3g', //optional
               }
            }
       ]
   }
];
```

```javascript
pbjs.setBidderConfig({
  bidders: ["docereeAdManager"],
  config: {
    docereeAdManager: {
      user: {
        data: {
          userid: "DE.V1.138353881958.178023499",
          email: "",
          firstname: "RAYMOND",
          lastname: "SCHONDELMEYER",
          specialization: "Pediatrics",
          hcpid: "9980811134",
          gender: "Male",
          city: "",
          state: "",
          zipcode: "65201",
          hashedNPI: "",
        },
      },
    },
  },
});
```
