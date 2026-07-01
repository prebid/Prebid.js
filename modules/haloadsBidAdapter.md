# Overview

Module Name: Haloads Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info.litelabs@gmail.com

**Bidder code:** `haloads`

# Description

The Haloads Bidder Adapter connects to Haloads exchange for bids. This adapter supports banner, video, and native ad formats and implements the OpenRTB 2.5 protocol.

**Currency**

- Haloads returns prices in **USD**. The adapter always sets `bid.currency` to `USD`

**Placement mapping**

- The adapter sets `imp.tagid` from `bid.params.placementId`. This value must match the placement identifier provided by Haloads team.
- The adapter also requires accountId as provided by Haloads team.

**Supported media types**

- Banner (`adm` → `bid.ad`)
- Video (`adm` → `bid.vastXml`; optional `nurl` → `bid.vastUrl`)
- Native (`adm` as OpenRTB Native JSON → `bid.native.ortb`)

# Bid Parameters

| Name           | Scope    | Type   | Description |
|----------------|----------|--------|-------------|
| `placementId`  | Required | String | Placement ID on Haloads  |
| `accountId`    | Required | String | Account ID for the publisher as configured on Haloads |

# Test Parameters

## Banner Ad Unit

```javascript
var adUnits = [
  {
    code: 'banner-ad-unit',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [{
      bidder: 'haloads',
      params: {
        accountId: '29291001',
        placementId: '12345'
      }
    }]
  }
];
```

## Video Ad Unit

```javascript
var adUnits = [
  {
    code: 'video-ad-unit',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        api: [2]
      }
    },
    bids: [{
      bidder: 'haloads',
      params: {
        accountId: '291001',
        placementId: 'video-12345'
      }
    }]
  }
];
```

## Native Ad Unit

```javascript
var adUnits = [
  {
    code: 'native-ad-unit',
    mediaTypes: {
      native: {
        title: {
          required: true,
          len: 80
        },
        image: {
          required: true,
          sizes: [300, 250]
        },
        sponsoredBy: {
          required: true
        }
      }
    },
    bids: [{
      bidder: 'haloads',
      params: {
        accountId: '291001',
        placementId: 'native-12345'
      }
    }]
  }
];
```

## Configuration

### User Sync

The adapter automatically handles user syncing with privacy consent parameters (GDPR, USP, GPP).

### Event Tracking

The adapter supports the following event callbacks:
- `onBidWon`: Triggered when a bid wins the auction
- `onAdRenderSucceeded`: Triggered when an ad successfully renders
- `onBidderError`: Triggered when a bidder error occurs
- `onTimeout`: Triggered when a bid request times out

