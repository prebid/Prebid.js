#Overview

```
Module Name: iQM Bidder Adapter
Module Type: Bidder Adapter
Maintainer: hbteam@iqm.com
```

# Parameters

| Name          | Scope    | Description               | Example              |
| :------------ | :------- | :------------------------ | :------------------- |
| `publisherId` | required | The Publisher ID from iQM | "df5fd732-c5f3-11e7" |
| `tagId`       | required | The tag ID from iQM       | "1c5c9ec2-c5f4-11e7" |
| `placementId` | required | The Placement ID from iQM | "50cc36fe-c5f4-11e7" |
| `bidfloor`    | optional | Bid Floor                 | 0.50                 |

# Description

Module that connects to iQM demand sources

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div1',
               sizes: [[320, 50]],  //  display 320x50
               bids: [
                   {
                       bidder: 'iqm',
                       params: {
                           publisherId: 'df5fd732-c5f3-11e7-abc4-cec278b6b50a',
                           tagId: '1c5c9ec2-c5f4-11e7-abc4-cec278b6b50a',
                           placementId: '50cc36fe-c5f4-11e7-abc4-cec278b6b50a',
                           bidfloor: 0.50,
                       }
                   }
               ]
           }
       ];
```
