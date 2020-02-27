# Overview

```
Module Name: Dspx Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@dspx.tv
```

# Description

Dspx adapter for Prebid.js 3.0

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [
                      [300, 250],
                      [300, 600],
                      ],  // a display size
                }
            },
            bids: [
                {
                    bidder: "dspx",
                    params: {
                        placement: '101',
                        devMode: true,   // if true: library uses dev server for tests
                        pfilter: {
                            floorprice: 1000000, // EUR * 1,000,000
                            private_auction: 1, // Is private auction?  0  - no, 1 - yes
                            deals: [
                                 "666-9315-d58a7f9a-bdb9-4450-a3a2-046ba8ab2489;3;25000000;dspx-tv",// DEAL_ID;at;bidfloor;wseat1,wseat2;wadomain1,wadomain2"
                                 "666-9315-d58a7f9a-bdb9-4450-a6a2-046ba8ab2489;3;25000000;dspx-tv",// DEAL_ID;at;bidfloor;wseat1,wseat2;wadomain1,wadomain2"
                            ],
                            geo: {  // set client geo info manually (empty for auto detect)
                               lat: 52.52437, // Latitude from -90.0 to +90.0, where negative is south.
                               lon: 13.41053, // Longitude from -180.0 to +180.0, where negative is west
                               type: 1,  // Source of location data: 1 - GPS/Location Services, 2 - IP Address, 3 - User provided (e.g. registration form)                         
                               country: 'DE',  // Region of a country using FIPS 10-4 notation
                               region: 'DE-BE', // Region code using ISO-3166-2; 2-letter state code if USA.
                               regionfips104: 'GM',  // Region of a country using FIPS 10-4 notation
                               city:  'BER', // City using United Nations Code for Trade and Transport Locations
                               zip: '10115' // Zip or postal code.
                                }
                            },
                        bcat:  "IAB2,IAB4",  // List of  Blocked Categories (IAB) - comma separated 
                        dvt: "desktop|smartphone|tv|tablet" // DeVice Type (autodetect if not exists)
                    }
                }
            ]
        },{
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[320, 50]],   // a mobile size
                }
            },
            bids: [
                {
                    bidder: "dspx",
                    params: {
                        placement: 101
                    }
                }
            ]
        }
    ];
```

Required param field is only `placement`. 