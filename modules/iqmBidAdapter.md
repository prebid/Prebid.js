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
| `placementId` | required | The Placement ID from iQM | "50cc36fe-c5f4-11e7" |
| `bidfloor`    | optional | Bid Floor                 | 0.50                 |

# Description

Module that connects to iQM demand sources

# Test Parameters
```
var videoAdUnit = {
      code: 'video1',
      mediaTypes: {
        video: {
          playerSize: [640,480],
          context: 'instream'
        }
      },
      bids: [{
        bidder: 'iqm',
        params: {
          publisherId: 'test_publisher_id',
          placementId: 23451,
          bidfloor: 0.50,
          video: {
            placement :2,
            mimes: ['video/mp4'],
            protocols: [2,5],
            skipppable: true,
            playback_method: ['auto_play_sound_off']
          }
        }
      }]
      
  
    var adUnits = [{
            code: 'div-gpt-ad-1460505748561-0',
            mediaTypes: {
                banner: {
                    sizes: [[844,617]]
                }
            },
           
                bidder: 'iqm',
                params: {
                    publisherId: 'test_publisher_id',
                    placementId: 23451,
                    bidfloor: 0.50
                }
            }]

        }]
```
