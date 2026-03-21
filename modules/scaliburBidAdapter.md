# Overview

**Module Name**: Scalibur Bid Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: support@scalibur.io  
**GVLID**: 1471

# Description

The Scalibur Bid Adapter connects publishers to Scalibur's programmatic advertising platform. It supports both banner and video ad formats through OpenRTB 2.x protocol and provides full compliance with privacy regulations.

**Key Features:**
- Banner and Video ad support
- OpenRTB 2.x compliant
- Privacy regulation compliance
- Floor pricing support
- User sync capabilities
- Supply chain transparency

# Test Parameters

## Banner

```javascript
var adUnits = [
  {
    code: 'test-banner-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [
      {
        bidder: 'scalibur',
        params: {
          placementId: 'test-scl-placement' // Required
        }
      }
    ]
  }
];
```

## Video

```javascript
var adUnits = [
  {
    code: 'test-video-div', 
    mediaTypes: {
      video: {
        playerSize: [[640, 480]],
        context: 'instream',
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        minduration: 5,
        maxduration: 30,
        startdelay: 0,
        playbackmethod: [1, 2],
        api: [1, 2]
      }
    },
    bids: [
      {
        bidder: 'scalibur',
        params: {
          placementId: 'test-scl-placement' // Required
        }
      }
    ]
  }
];
```

# Configuration
## Required Parameters

| Name | Scope | Description | Example | Type |
| --- | --- | --- | --- | --- |
| `placementId` | required | Placement identifier provided by Scalibur | `'test-placement-123'` | `string` |

# Additional Information

## User Syncs
The adapter supports both iframe and image-based user syncs:
- **Iframe sync**
- **Image sync**

All privacy parameters are automatically included in sync URLs.

