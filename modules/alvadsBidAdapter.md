# Overview
**Module Name:** alvadsBidAdapter  
**Module Type:** bidder  
**Maintainer:** alvads@oyealva.com

---

# Description
The **Alva Bid Adapter** allows publishers to connect their banner and video inventory with the Alva demand platform.

- **Bidder Code:** `alvads`
- **Supported Media Types:** `banner`, `video`
- **Protocols:** OpenRTB 2.5 via POST for both banner and video
- **Dynamic Endpoints:** The adapter can use a default endpoint or a custom endpoint provided in the bid params.
- **Price Floors:** Supported via `bid.getFloor()`. If configured, the adapter will send `bidfloor` and `bidfloorcur` per impression.

---
# Parameters

| Parameter   | Required         | Description |
|------------ |---------------- |------------ |
| publisherId | Yes             | Publisher ID assigned by Alva |
| tagid       | Banner only      | Required for banner impressions |
| bidfloor    | No              | Optional; adapter supports floors module via `bid.getFloor()` |
| userId      | No              | Optional; used for user identification |
| endpoint    | No              | Optional; overrides default endpoint |

---

# Test Parameters

## Banner Example

```javascript
var adUnits = [{
    code: 'div-banner',
    mediaTypes: {
        banner: {
            sizes: [[300, 250], [320, 100]]
        }
    },
    bids: [{
        bidder: 'alvads',
        params: {
            publisherId: 'pub-123',    // required
            tagid: 'tag-456',           // required for banner
            bidfloor: 0.50,             // optional
            userId: '+59165352182',     // optional
            endpoint: 'https://custom-endpoint.com/openrtb' // optional, overrides default
        }
    }]
}];
```

## Video Example

```javascript
var adUnits = [{
    code: 'video-ad',
    mediaTypes: {
        video: {
            context: 'instream',
            playerSize: [[640, 360]]
        }
    },
    bids: [{
        bidder: 'alvads',
        params: {
            publisherId: 'pub-123',     // required
            bidfloor: 0.5,              // optional
            userId: '+59165352182',     // optional
            endpoint: 'https://custom-endpoint.com/video' // optional, overrides default
        }
    }]
}];
```

---

# Request Information

### Banner  / Video
- **Endpoint:**
  ```
  https://helios-ads-qa-core.ssidevops.com/decision/openrtb
  ```
- **Method:** `POST`
- **Payload:** OpenRTB 2.5 request containing `site`, `device`, `user`, `regs`, `imp`.
- **Dynamic Endpoint:** The request URL can be overridden by bid.params.endpoint.


# Response Information

### Banner
The response is standard OpenRTB with `seatbid`. Example:

```json
{
  "id": "response-id",
  "seatbid": [{
    "bid": [{
      "impid": "imp-123",
      "price": 0.50,
      "adm": "<div>Creative</div>",   
      "crid": "creative-1",
      "w": 320,
      "h": 100,
      "ext": {
        "vast_url": "http://example.com/vast.xml" 
      },
      "adomain": ["example.com"]       
    }]
  }],
  "cur": "USD"
}

```
# Interpretation:

If adm contains <VAST>, the adapter sets mediaType: 'video' and includes vastXml & vastUrl.

Otherwise, mediaType: 'banner' and ad contains the HTML.


# Additional Details

- **Defaults:**
    - `netRevenue = true`
    - `ttl = 300`
    - Banner fallback size: `320x100`
    - Video fallback size: `1280x720`

- **Callbacks:**
    - `onTimeout` → logs timeout events
    - `onBidWon` → logs winning bid  
