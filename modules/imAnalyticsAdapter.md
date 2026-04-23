# Overview

```
Module Name: IM Analytics Adapter
Module Type: Analytics Adapter
Maintainer: Intimate Merger
```

#### About

Analytics Adapter for IM-DMP.

Please visit [intimatemerger.com/im-uid](https://intimatemerger.com/r/im-uid) and request your Customer ID to get started.

If you are an existing publisher and you already use
[IM-UID](https://docs.prebid.org/dev-docs/modules/userid-submodules/imuid.html),
you can use the same Customer ID for this analytics adapter.

By enabling this adapter, you agree to Intimate Merger's privacy policy at
<https://corp.intimatemerger.com/privacypolicy/>.

#### Analytics Options

{: .table .table-bordered .table-striped }
| Parameter | Scope | Type | Example | Description |
|-----------|-------|------|---------|-------------|
| `cid` | optional | number | 5126 | The Customer ID provided by Intimate Merger. |
| `waitTimeout` | optional | number | 1500 | Wait time in milliseconds before sending batched requests. (Default: 1500)  |

#### Example Configuration

```javascript
pbjs.enableAnalytics({
    provider: 'imAnalytics',
    options: {
        /* Optional: Customer ID */
        cid: 5126,
        /* Optional: Wait 2 seconds */
        waitTimeout: 2000
    }
});
```
