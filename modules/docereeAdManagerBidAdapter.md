# Overview

```
Module Name: Doceree AdManager Bidder Adapter
Module Type: Bidder Adapter
Maintainer: tech.stack@doceree.com
```

<!-- # Description -->

Connects to Doceree demand source to fetch bids.  
Please use `docereeadmanager` as the bidder code.

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
               bidder: 'docereeadmanager',
               params: {
                    placementId: 'DOC-19-1', //required
                    publisherUrl: document.URL || window.location.href, //optional
                    gdpr: '1', //optional
                    gdprconsent:'CPQfU1jPQfU1jG0AAAENAwCAAAAAAAAAAAAAAAAAAAAA.IGLtV_T9fb2vj-_Z99_tkeYwf95y3p-wzhheMs-8NyZeH_B4Wv2MyvBX4JiQKGRgksjLBAQdtHGlcTQgBwIlViTLMYk2MjzNKJrJEilsbO2dYGD9Pn8HT3ZCY70-vv__7v3ff_3g', //optional
               }
            }
       ]
   }
];
```

```javascript
pbjs.setBidderConfig({
  bidders: ['docereeadmanager'],
  config: {
    docereeadmanager: {
      user: {
        data: {
          email: 'XXX.XXX@GMAIL.COM',
          firstname: 'DR. XXX',
          lastname: 'XXX',
          mobile: '981234XXXX',
          specialization: 'Internal Medicine',
          organization: 'Max Lifecare',
          hcpid: '199291XXXX',
          dob: '1987-08-27',
          gender: 'Female',
          city: 'Oildale',
          state: 'California',
          country: 'California',
          hashedhcpid: '',
          hashedemail: '',
          hashedmobile: '',
          userid: '7d26d8ca-233a-46c2-9d36-7c5d261e151d',
          zipcode: '',
          userconsent: '1',
        },
      },
    },
  },
});
```
