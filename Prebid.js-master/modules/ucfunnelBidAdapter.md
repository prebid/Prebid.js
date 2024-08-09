# Overview

```
Module Name: ucfunnel Bid Adapter
Module Type: Bidder Adapter
Maintainer: ryan.chou@ucfunnel.com
```

# Description

This module connects to ucfunnel's demand sources. It supports display, and rich media formats.
ucfunnel will provide ``adid`` that are specific to your ad type.
Please reach out to ``pr@ucfunnel.com`` to set up an ucfunnel account and above ids.
Use bidder code ```ucfunnel``` for all ucfunnel traffic.

# Test Parameters

```
  var adUnits = [
    {
      code: 'test-LERC',
      sizes: [[300, 250]],
      bids: [{
        bidder: 'ucfunnel',
        params: {
          adid: "test-ad-83444226E44368D1E32E49EEBE6D29"        //String - required
        }
    }
  ];
```