# Overview

```markdown
Module Name: T-Advertising Solutions Bid Adapter
Module Type: Bidder Adapter
Maintainer: dev@emetriq.com
```

# Description
The T-Advertising Solutions Bid Adapter is a module that connects to T-Advertising Solutions demand sources, enabling 
publishers to access advertising demand. This adapter facilitates real-time bidding integration between Prebid.js and 
T-Advertising Solutions' platform.

This adapter supports both Banner and Video ad formats

# Test Parameters
The following ad units demonstrate how to configure the adapter for different ad formats:

## Banner Ad Unit Example
```javascript
var bannerAdUnit = {
    code: 'myBannerAdUnit',
    mediaTypes: {
        banner: {
            sizes: [400, 600],
        }
    },
    bids: [
        {
            bidder: 'tadvertising',
            params: {
                publisherId: '1427ab10f2e448057ed3b422',
                placementId: 'sidebar_1',
                bidfloor: 0.95 // Optional - default is 0
            }
        }
    ]
};
```

The banner ad unit configuration above demonstrates how to set up a basic banner implementation.

## Video Ad Unit Example
```javascript
var videoAdUnit = {
    code: 'myVideoAdUnit',
    mediaTypes: {
        video: {
            mimes: ['video/mp4'],
            minduration: 1,
            maxduration: 60,
            api: [1, 3],
            placement: 3,
            protocols: [2,3,5,6]
        }
    },
    bids: [
        {
            bidder: "tadvertising",
            params: {
                publisherId: '1427ab10f2e448057ed3b422',
                placementId: 'sidebar_1',
                bidfloor: 0.95 // Optional - default is 0
            }
        }
    ]
}
```
The video ad unit configuration demonstrates how to set up a basic video implementation.

# GDPR Compliance

The T-Advertising Solutions adapter supports the IAB Europe Transparency & Consent Framework (TCF) for GDPR compliance. 
When properly configured, the adapter will pass consent information to T-Advertising Solutions' servers.
