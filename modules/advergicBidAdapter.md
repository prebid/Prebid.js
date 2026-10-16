# Overview

```text
Module Name:  Advergic Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   hello@advergic.com
```

# Description

Connects to Advergic exchange for bids.

The Advergic bid adapter supports Banner only.

# Test Parameters

The Advergic adapter requires an `accountId` issued by Advergic. Publishers should
contact [hello@advergic.com](mailto:hello@advergic.com) to obtain an `accountId` and
test credentials.

Replace `YOUR_TEST_ACCOUNT_ID` below with the test account ID provided by Advergic.

```javascript
var adUnits = [
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]]
      }
    },
    bids: [{
      bidder: 'advergic',
      params: {
        accountId: 'YOUR_TEST_ACCOUNT_ID'
      }
    }]
  }
];
```

# How to View Advergic Bid Requests in the Network Tab

Open a webpage where Advergic is configured to bid. Open your browser's developer
tools and select the Network tab. Search for requests containing `pbs.avads.live`.
These requests include the bid endpoint and, when enabled, user-sync and event-tracking
requests.

# User Sync and Identifier Disclosure

When Prebid user sync is enabled and the Advergic bid response does not contain an
accepted user-sync URL, the adapter uses this fallback endpoint:

- `https://pbs.avads.live/id/setuid?bidder=advergic&f=i` for iframe sync, when iframe sync is enabled.
- `https://pbs.avads.live/id/setuid?bidder=advergic&f=b` for image sync, when iframe sync is disabled and image sync is enabled.

The setuid endpoint may establish or refresh the persistent `_advid` identifier used
by the Advergic/Prebid Server integration for user recognition and syncing. The adapter
does not read or write this cookie directly; the endpoint response controls its cookie
attributes and retention period. Those attributes and the precise retention duration
are not specified by this client adapter.

If the server response provides sync URLs under `response.ext.sync`, the adapter uses
the supported URLs from that response instead of the fallback. The adapter appends
available GDPR, US Privacy (USP), and GPP signals to sync URLs. User sync is suppressed
for COPPA traffic.

Publishers can control whether user sync runs through their Prebid.js `userSync`
configuration. Publishers should review the use of the `_advid` identifier and ensure
their privacy notices and consent configuration appropriately describe this behavior
for their deployment and applicable jurisdictions.