# Overview

**Module Name**: Hubvisor Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: prebid@hubvisor.io

# Description

Hubvisor Bidder Adapter for Prebid.js. Supports banner and video (instream/outstream) media types.

Contact [prebid@hubvisor.io](mailto:prebid@hubvisor.io) for setup and to obtain a placement ID.

# Parameters

| Name | Scope | Description | Example | Type |
|------|-------|-------------|---------|------|
| `placementId` | optional | Hubvisor placement identifier provided by Hubvisor. | `'my-placement-id'` | String |
| `video.maxWidth` | optional | Maximum player width in pixels for outstream video. | `640` | Number |
| `video.targetRatio` | optional | Target aspect ratio for outstream video (e.g. `16/9`). | `1.777` | Number |
| `video.selector` | optional | CSS selector for a custom outstream player container element. | `'#my-video-container'` | String |

# Test Parameters

```javascript
var adUnits = [
  // Banner adUnit
  {
    code: 'test-div-banner',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [{
      bidder: 'hubvisor',
      params: {
        placementId: 'test-placement-banner'
      }
    }]
  },
  // Outstream video adUnit
  {
    code: 'test-div-video',
    mediaTypes: {
      video: {
        context: 'outstream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [1, 2, 3, 4, 5, 6],
        playbackmethod: [2]
      }
    },
    bids: [{
      bidder: 'hubvisor',
      params: {
        placementId: 'test-placement-video',
        video: {
          maxWidth: 640,
          targetRatio: 1.777
        }
      }
    }]
  }
];
```
