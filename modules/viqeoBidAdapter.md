# Overview

**Module Name**: Viqeo Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: muravjovv1@gmail.com

# Description

Viqeo Bidder Adapter for Prebid.js. About: https://viqeo.tv/

### Bid params

{: .table .table-bordered .table-striped }
| Name                        | Scope    | Description                                                                                                         | Example                  | Type      |
|-----------------------------|----------|---------------------------------------------------------------------------------------------------------------------|--------------------------|-----------|
| `tagid`                     | required | The unique identifier of the ad placement. Could be obtained from the Viqeo UI or from your account manager.        | `2`                      | `string`  |
| `playerOptions`             | required | The object containing Viqeo player options                                                                          | `playerOptions: {}`      | `object`  |
| `playerOptions.profileId`   | required | Viqeo profile id                                                                                                    | `1382`                   | `number`  |
| `playerOptions.videId`      | optional | Viqeo video id                                                                                                      | `"ed584da454c7205ca7e4"` | `string`  |
| `playerOptions.playerId`    | optional | Viqeo player id                                                                                                     | `1`                      | `number`  |
| `user`                      | optional | The object containing user data (See OpenRTB spec)                                                                  | `user: {}`               | `object`  |
| `device`                    | optional | The object containing device data (See OpenRTB spec)                                                                | `device: {}`             | `object`  |
| `site`                      | optional | The object containing site data (See OpenRTB spec)                                                                  | `site: {}`               | `object`  |
| `floor`                     | optional | Bid floor price                                                                                                     | `0.5`                    | `number`  |
| `currency`                  | optional | 3-letter ISO 4217 code defining the currency of the bid.                                                            | `EUR`                    | `string`  |
| `test`                      | optional | Flag which will induce a sample bid response when true; only set to true for testing purposes (1 = true, 0 = false) | `1`                      | `integer` |
| `renderUrl`                 | optional | For debug, script player url                                                                                        | `"https://viqeo.tv"`     | `string`  |
| `endpointUrl`               | optional | For debug, api endpoint                                                                                             | `"https://viqeo.tv"`     | `string`  |

# Test Parameters
```
    var adUnits = [{
      code: 'your-slot', // use exactly the same code as your slot div id.
      mediaTypes: {
          video: {
            context: 'outstream',
            playerSize: [640, 480]  
          }
      },
      bids: [{
        bidder: 'viqeo',
        params: { 
            tagId: '2',
            playerOptions: {
                videoId: 'ed584da454c7205ca7e4',
                profileId: 1382,
            },
            test: 1,
        }
      }]
    }];
```
