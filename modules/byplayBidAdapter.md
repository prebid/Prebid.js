# Overview

```
Module Name: ByPlay Bidder Adapter
Module Type: Bidder Adapter
Maintainer: byplayers@tsumikiinc.com
```

# Description

Connects to ByPlay exchange for bids.

ByPlay bid adapter supports Video.

# Test Parameters
```
  const adUnits = [
    {
      code: 'byplay-ad',
      mediaTypes: {
        video: {
          playerSize: [400, 225],
          context: 'outstream'
        }
      },
      bids: [
        {
          bidder: 'byplay',
          params: {
            sectionId: '7986',
            env: 'dev'
          }
        }
      ]
    }
  ];
```
