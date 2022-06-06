## Overview

Module Name: Geoedge Rtd provider
Module Type: Rtd Provider
Maintainer: guy.books@geoedge.com

The Geoedge Realtime module lets publishers block bad ads such as automatic redirects, malware, offensive creatives and landing pages.
To use this module, you'll need to work with [Geoedge](https://www.geoedge.com/publishers-real-time-protection/) to get an account and cutomer key.

## Integration

1) Build the geoedge RTD module into the Prebid.js package with:

```
gulp build --modules=geoedgeRtdProvider,...
```

2) Use `setConfig` to instruct Prebid.js to initilize the geoedge module, as specified below.

## Configuration

This module is configured as part of the `realTimeData.dataProviders` object:

```javascript
pbjs.setConfig({
    realTimeData: {
        dataProviders: [{
            name: 'geoedge',
            params: {
                key: '123123', 
                bidders: {
                    'bidderA': true, // monitor bids form this bidder
                    'bidderB': false // do not monitor bids form this bidder.
                },
                wap: true
            }
        }]
    }
});
```

Parameters details:

{: .table .table-bordered .table-striped }
|Name |Type |Description |Notes |
| :------------ | :------------ | :------------ |:------------ |
|name | String | Real time data module name |Required, always 'geoedge' |
|params | Object | | |
|params.key | String | Customer key |Required, contact Geoedge to get your key |
|params.bidders | Object | Bidders to monitor |Optional, list of bidder to include / exclude from monitoring. Omitting this will monitor bids from all bidders. |
|params.wap |Boolean |Wrap after preload |Optional, defaults to `false`. Set to `true` if you want to monitor only after the module has preloaded the monitoring client. |

## Example

To view an integration example:
 
1) in your cli run:

```
gulp serve --modules=appnexusBidAdapter,geoedgeRtdProvider
```

2) in your browser, navigate to:

```
http://localhost:9999/integrationExamples/gpt/geoedgeRtdProvider_example.html
```
