# Overview

```text
Module Name:  ConnectAd PreBid Adapter
Module Type:  Bidder Adapter
Maintainer: support@connectad.io
```

# Description

ConnectAd Bid Adapter supports Banner, Video (Instream/Outstream), Native, and Audio formats. It natively supports OpenRTB 2.5/2.6 standard features, including automated Price Floors, First Party Data, Viewability (`percentInView`), EIDS, and all common privacy regulations (GDPR, CCPA, GPP, COPPA, DSA).

# Bid Params

| Name          | Scope    | Description                                                                                                 | Type      |
|---------------|----------|-------------------------------------------------------------------------------------------------------------|-----------|
| `siteId`      | required | The site ID from ConnectAd.                                                                                 | integer   |
| `networkId`   | required | The network ID from ConnectAd.                                                                              | integer   |
| `bidfloor`    | optional | Requested floor price (fallback if the Price Floors module does not set one).                               | number    |
| `endpointUrl` | optional | Override the bid endpoint URL for testing or a custom datacenter. Defaults to `https://i.connectad.io/api/v3`. | string    |

# Sample Ad Units

## Banner
```javascript
var adUnits = [
{
    code: 'test-div',
    mediaTypes: {
        banner: {
            sizes: [[300, 250], [300,600]]
        }
    },
    bids: [{
        bidder: 'connectad',
        params: {
            siteId: 123456,     
            networkId: 123456,
            bidfloor: 0.20 // Optional: Requested Bidfloor (fallback if floor module is missing)
        }
    }]
}];
```

## Video
```javascript
var adUnits = [
{
    code: 'test-video',
    mediaTypes: {
        video: {
            context: 'instream',
            playerSize: [[640, 480]],
            mimes: ['video/mp4'],
            protocols: [1, 2, 3, 4, 5, 6, 7, 8],
            playbackmethod: [2],
            skip: 1
        }
    },
    bids: [{
        bidder: 'connectad',
        params: {
            siteId: 123456,     
            networkId: 123456
        }
    }]
}];
```

## Native
```javascript
var adUnits = [
{
    code: 'test-native',
    mediaTypes: {
        native: {
            title: {
                required: true
            },
            image: {
                required: true
            },
            sponsoredBy: {
                required: false
            }
        }
    },
    bids: [{
        bidder: 'connectad',
        params: {
            siteId: 123456,     
            networkId: 123456
        }
    }]
}];
```

## Audio
```javascript
var adUnits = [
{
    code: 'test-audio',
    mediaTypes: {
        audio: {
            context: 'instream',
            maxduration: 30,
            mimes: ['audio/mp4', 'audio/mpeg']
        }
    },
    bids: [{
        bidder: 'connectad',
        params: {
            siteId: 123456,
            networkId: 123456
        }
    }]
}];
```

# Viewability

The adapter automatically measures viewability for Banner and Video slots via the core `percentInView` library and forwards it as `imp.ext.viewability`. No extra configuration is required; if the slot element cannot be measured the field is simply omitted.

# First Party Data

Publishers should use the `ortb2` method of setting [First Party Data](https://docs.prebid.org/features/firstPartyData.html). Supported fields include `ortb2.site.*`, `ortb2.user.*`, and AdUnit-specific `AdUnit.ortb2Imp.ext.*`.

# Configuration

ConnectAd recommends the UserSync configuration below otherwise we will not be able to perform user syncs.

```javascript
pbjs.setConfig({
    userSync: {
        filterSettings: {
            iframe: {
                bidders: ['connectad'],
                filter: 'include'
            }
        }
    }
});
```