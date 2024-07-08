# Overview

Module Name: iiqAnalytics
Module Type: Analytics Adapter
Maintainer: julian@intentiq.com

# Description

By using this Intent IQ adapter, you will be able to obtain comprehensive analytics and metrics regarding the performance of the Intent IQ Unified ID module. This includes how the module impacts your revenue, CPMs, and fill rates related to bidders and domains.

## Intent IQ Universal ID Registration

No registration for this module is required.

## Intent IQ Universal IDConfiguration

<B>IMPORTANT</B>: only effective when Intent IQ Universal ID module is installed and configured. [(How-To)](https://docs.prebid.org/dev-docs/modules/userid-submodules/intentiq.html)

No additional configuration for this module is required. We will use the configuration provided for Intent IQ Universal IQ module.

#### Example Configuration

```js
pbjs.enableAnalytics({
    provider: 'iiqAnalytics'
});
```
