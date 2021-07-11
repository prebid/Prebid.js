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
               }
            }
       ]
   }
];
```
