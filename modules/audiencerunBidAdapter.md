# Overview

**Module Name**: AudienceRun Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: github@audiencerun.com

# Description

Module that connects to AudienceRun demand sources

Use `audiencerun` as bidder.

`zoneId` is required and must be 10 alphanumeric characters.

## AdUnits configuration example
```
    var adUnits = [{
      code: 'ad-slot-300x600',
      mediaTypes: {
        banner: {
          sizes: [
                [300, 600]
            ],
        }
      },
      bids: [{
          bidder: 'audiencerun',
          params: { 
              zoneId: 'xtov2mgij0'
          }
      }]
    },{
      code: 'ad-slot-728x90',
      mediaTypes: {
        banner: {
          sizes: [
                [728, 90]
            ],
        }
      },
      bids: [{
          bidder: 'audiencerun',
          params: { 
              zoneId: 'u4q6z6u97b'
          }
      }]
    }];
```
