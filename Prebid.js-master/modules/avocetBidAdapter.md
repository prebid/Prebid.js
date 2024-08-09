# Overview

```
Module Name: Avocet Bidder Adapter
Module Type: Bidder Adapter
Maintainer: developers@avocet.io
```

# Description

Module that connects to the Avocet advertising platform.

# Parameters

| Name          | Scope    | Description                         | Example                    |
| :------------ | :------- | :---------------------------------- | :------------------------- |
| `placement`   | required | A Placement ID from Avocet.         | "5ebd27607781b9af3ccc3332" |


# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],  // a display size
                }
            },
            bids: [
                {
                    bidder: "avct",
                    params: {
                        placement: "5ebd27607781b9af3ccc3332"
                    }
                }
            ]
        }
    ];
```