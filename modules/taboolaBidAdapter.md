# Overview

```
Module Name: Taboola Adapter
Module Type: Bidder Adapter
Maintainer: prebid@taboola.com
```

# Description

Module that connects to Taboola bidder to fetch bids.
support display format. Using OpenRTB standard.

# Test Display Parameters
```
   var adUnits = [{
            code: 'your-unit-container-id',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250], [300,600]],
                }
            },
            bids: [{
                bidder: 'taboola',
                params: {
                  tagId: 'test-1',
                  publisherId: 'test',
                  bidfloor: 0.25, // optional default is null
                  bidfloorcur: 'USD', // optional default is USD
                  bcat: ['IAB1-1'], // optional default is []
                  badv: ['example.com']  // optional default is []
                }
            }]
        }];
```

# Parameters

| Name           | Scope    | Description                                         | Example                  | Type         |
|----------------|----------|-----------------------------------------------------|--------------------------|--------------|
| `tagId`        | required | Tag Id / Placement name                             | `below the article`      | `String`     |
| `publisherId`  | required | Publisher id                                        | `Publisher name`         | `String`     |
| `bcat`         | optional | list of blocked advertiser categories (IAB)         | `['IAB1-1']`             | `Array`      |
| `badv`         | optional | Blocked Advertiser Domains                          | `example.com`            | `String Url` |
| `bidfloor`     | optional | CPM bid floor                                       | `0.25`                   | `Integer`    |
| `bidfloorcur`  | optional | CPM bid floor currency                              | `Euro`                   | `Integer`    |

