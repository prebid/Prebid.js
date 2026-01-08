# Overview

```txt
Module Name: 33Across Analytics Adapter
Module Type: Analytics Adapter
Maintainer:  analytics_support@33across.com
```

#### About

This analytics adapter collects data about the performance of your ad slots
for each auction run on your site. It also provides insight into how identifiers
from the
[33Across User ID Sub-module](https://docs.prebid.org/dev-docs/modules/userid-submodules/33across.html)
and other user ID sub-modules improve your monetization. The data is sent at
the earliest opportunity for each auction to provide a more complete picture of
your ad performance.

The analytics adapter is free to use!
However, the publisher must work with our account management team to obtain a
Publisher/Partner ID (PID) and enable Analytics for their account.
To get a PID and to have the publisher account enabled for Analytics,
you can reach out to our team at the following email - analytics_support@33across.com

If you are an existing publisher and you already use a 33Across PID,
you can reach out to analytics_support@33across.com
to have your account enabled for analytics.

The 33Across privacy policy is at <https://www.33across.com/privacy-policy/>.

#### Analytics Options

| Name      | Scope    | Example | Type     | Description |
|-----------|----------|---------|----------|-------------|
| `pid`     | required | abc123  | `string` | 33Across Publisher ID |
| `timeout` | optional | 10000   | `int`    | Milliseconds to wait after last seen auction transaction before sending report (default 10000). |

#### Configuration

The data is sent at the earliest opportunity for each auction to provide
a more complete picture of your ad performance, even if the auction is interrupted
by a page navigation. At the latest, the adapter will always send the report
when the page is unloaded, at the end of the auction, or after the timeout,
whichever comes first.

In order to guarantee consistent reports of your ad slot behavior, we recommend
including the GPT Pre-Auction Module, `gptPreAuction`. This module is included
by default when Prebid is downloaded. If you are compiling from source,
this might look something like:

```sh
gulp bundle --modules=gptPreAuction,consentManagementTcf,consentManagementGpp,consentManagementUsp,tcfControl,33acrossBidAdapter,33acrossIdSystem,33acrossAnalyticsAdapter
```

Enable the 33Across Analytics Adapter in Prebid.js using the analytics provider `33across`
and options as seen in the example below.

#### Example Configuration

```js
pbjs.enableAnalytics({
    provider: '33across',
    options: {
        /**
         * The 33Across Publisher ID.
         */
        pid: 'abc123',
        /** 
         * Timeout in milliseconds after which an auction report 
         * will be sent regardless of auction state.
         * [optional]
         */
        timeout: 10000
    }
});
```
