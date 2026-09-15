## Overview

Module Name: Geoedge Rtd provider
Module Type: Rtd Provider
Maintainer: guy.books@geoedge.com

The Geoedge Realtime module lets publishers block bad ads such as automatic redirects, malware, offensive creatives and landing pages.
To use this module, you'll need to work with [Geoedge](https://www.geoedge.com/publishers-real-time-protection/) to get an account and customer key.

## Integration

1) Build the geoedge RTD module into the Prebid.js package with:

```
gulp build --modules=geoedgeRtdProvider,...
```

2) Use `setConfig` to instruct Prebid.js to initialize the geoedge module, as specified below.

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
                    'bidderA': true, // monitor bids from this bidder
                    'bidderB': false // do not monitor bids from this bidder.
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
|params.wap |Boolean |Wrap after client load |Optional, defaults to `false`. Set to `true` if you want to monitor only after the module has loaded the monitoring client. |
|params.gpt |Boolean |Wrap all GPT ad slots |Optional, defaults to `false`. Set to `true` if you want to monitor all Google Publisher Tag ad slots, regardless if the winning bid comes from Prebid or Google Ad Manager (Direct, Adx, AdSense, Open Bidding, etc). |
|params.outstream |Boolean |Monitor outstream video |Optional, defaults to `false`. Set to `true` to extend monitoring to outstream video bids. See "Outstream video" below. |

## Outstream video

Video creatives are VAST rather than HTML, so they cannot be wrapped the way display creatives are.
With `outstream: true` the module instead wraps the bid's own `renderer.render` and asks the
monitoring client whether the creative may run:

```javascript
pbjs.setConfig({
    realTimeData: {
        dataProviders: [{
            name: 'geoedge',
            params: {
                key: '123123',
                outstream: true
            }
        }]
    }
});
```

Behavior worth knowing before enabling it:

- **Render timing.** The monitoring client is loaded when the module initializes, so by the time a
  bid renders it has normally already answered and rendering proceeds immediately. Only a render that
  happens before the client is ready waits for the answer, and that wait is capped by a short
  deadline.
- **It fails open.** If the client does not load within that deadline, or loads without a verdict for
  the bid, the creative renders unmonitored. An ad is never lost because monitoring was unavailable.
- **It only affects bids Prebid renders through the bid's renderer.** Bids carrying a `safeRenderer`,
  and bids whose VAST reaches a player straight from targeting or Prebid Cache, are left untouched.
- **Display monitoring is unchanged.** A bid handled by the outstream path is not also HTML-wrapped.

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
