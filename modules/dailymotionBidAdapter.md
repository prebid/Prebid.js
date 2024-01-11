# Overview

```
Module Name: Dailymotion Bid Adapter
Module Type: Bidder Adapter
Maintainer: ad-leo-engineering@dailymotion.com
```

# Description

Dailymotion prebid adapter.

# Configuration options

Before calling this adapter, you need to set its configuration with a call to setConfig like this:

```
config.setConfig({
  dailymotion: {
    api_key: 'test_api_key',
    position: 'test_position',
    xid: 'x123456'
  }
});
```

This call must be made before each auction. Here's a description of each parameter:
* `api_key` is your publisher API key. For testing purpose, you can use "dailymotion-testing".
* `position` parameter is the ad position in the video and must either be "preroll", "midroll" or "postroll".
* `xid` is the Dailymotion video identifier and should be provided to have better contextual data and higher fillrate.

# Test Parameters

By setting the following configuration options, you'll get a constant response to any request to validate your adapter integration:

```
config.setConfig({
  dailymotion: {
    api_key: 'dailymotion-testing',
    position: 'preroll'
  }
});
```

Please note that failing to set these configuration options will result in the adapter not bidding at all.

# Sample video AdUnit

```
const adUnits = [
  {
    code: 'test-ad-unit',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [1280, 720],
      },
    },
    bids: [{
      bidder: "dailymotion",
      params: {}
    }]
  }
];
```

# Integrating the adapter

To use the adapter with any non-test request, you first need to ask an API key from Dailymotion. Please contact us through **DailymotionPrebid.js@dailymotion.com**.

You will then be able to use it within the `config` before making a bid request.

This API key will ensure proper identification of your inventory and allow you to get real bids.
