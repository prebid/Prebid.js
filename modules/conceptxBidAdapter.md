# Overview

```
Module Name: ConceptX Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@concept.dk
```

# Description

ConceptX Bidder Adapter for Prebid.js. 
Only Banner format is supported.

# Test Parameters
```
    var adUnits = [
            {
                code: "test-div",
                mediaTypes: {
                    banner: {
                        sizes: [[980, 180]]
                    }
                },
                bids: [
                    {
                        bidder: "conceptx",
                        params: {
                            site: "example",
                            adunit: "some-id-3",
                        }
                    },
                ]
            },
           
        ];
```
