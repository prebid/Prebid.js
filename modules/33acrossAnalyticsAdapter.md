# Overview

```txt
Module Name: 33Across Analytics Adapter
Module Type: Analytics Adapter
Maintainer:  headerbidding@33across.com
```

# Description

## Configuration

In order to guarantee consistent reports of your ad slot behavior, we recommend
including the GPT Pre-Auction Module, `gptPreAuction`. If you are compiling from
source, this might look something like:

```sh
gulp bundle --modules=gptPreAuction,consentManagement,consentManagementGpp,consentManagementUsp,enrichmentFpdModule,gdprEnforcement,33acrossBidAdapter,33acrossAnalyticsAdapter
```

Enable the 33Across Analytics Adapter in Prebid.js using the analytics provider `33across`
and options as seen in the example below. The analytics adapter is free to use!
However, the publisher must work with our account management team to obtain
a Publisher/Partner ID (PID). If you are already using the 33Across PID,
you may use your existing PID with the analytics adapter.

```js
pbjs.enableAnalytics({
    provider: '33across',
    options: {
        /**
         * The 33Across PID (PID).
         */
        pid: 12345,
        /** 
         * Defaults to the 33Across Analytics endpoint if not provided.
         * [optional]
         */
        endpoint: 'https://localhost:9999/event',
        /** 
         * Timeout in milliseconds after which an auction report 
         * will be sent regardless of auction state
         * [optional]
         */
        timeout: 3000
    }
});
```

## Privacy Policy

The 33Across privacy policy is at <https://www.33across.com/privacy-policy/>
