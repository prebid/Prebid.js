# Pigeoon Bid Adapter

## Overview

| Bidder Code | Pigeoon |
|-------------|---------|
| Bidder        | `pigeoon`  |
| Maintainer    | destek@pigeoon.com |
| Type          | SSP |
| GDPR Support  | Yes |
| User Sync     | iframe |
| Media Types   | Banner |

## Description

Pigeoon is a publisher-focused ad technology platform that helps publishers build and manage their own ad tech stack. The Pigeoon bid adapter enables header bidding integration with Google Ad Manager (GAM) for direct sales campaigns.

## Bid Params

| Name | Scope | Description | Example | Type |
|------|-------|-------------|---------|------|
| `networkId` | required | Publisher network ID provided by Pigeoon | `'net_ABC123'` | String |
| `placementId` | required | Placement ID provided by Pigeoon | `'12345678'` | String |

## Setup

### Basic Banner Setup

```javascript
var adUnits = [{
    code: 'div-banner-1',
    mediaTypes: {
        banner: {
            sizes: [[300, 250], [728, 90]]
        }
    },
    bids: [{
        bidder: 'pigeoon',
        params: {
            networkId: 'net_ABC123',
            placementId: '12345678'
        }
    }]
}];
```

## User Sync

Pigeoon uses iframe-based user sync. Add the following to your Prebid configuration:

```javascript
pbjs.setConfig({
    userSync: {
        iframeEnabled: true,
        filterSettings: {
            iframe: {
                bidders: ['pigeoon'],
                filter: 'include'
            }
        }
    }
});
```

## GDPR

This adapter supports GDPR via TCF 2.0. Consent string is passed in the bid request when available.

## ads.txt

Publishers must add the following line to their `ads.txt` file: