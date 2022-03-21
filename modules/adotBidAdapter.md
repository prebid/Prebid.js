# Adot Bidder Adapter

Adot Bidder Adapter is a module that enables the communication between the Prebid.js library and Adot's DSP.

## Overview

- Module name: Adot Bidder Adapter
- Module type: Bidder Adapter
- Maintainer: `alexandre.lorin@adotmob.com`
- Supported media types: `banner`, `video`, `native`

## Example ad units

### Banner ad unit

Adot Bidder Adapter accepts banner ad units using the following ad unit format:

```javascript
const adUnit = {
    code: 'test-div',
    mediaTypes: {
        banner: {
            // Dimensions supported by the banner ad unit.
            // Each ad unit size is formatted as follows: [width, height].
            sizes: [[300, 250]]
        }
    },
    bids: [{
        bidder: 'adot',
        params: {}
    }]
}
```

### Video ad unit

#### Video ad unit

Adot Bidder Adapter accepts video ad units using the following ad unit format:

```javascript
const adUnit = {
    code: 'test-div',
    mediaTypes: {
        video: {
            // Video context. Must be 'outstream'.
            context: 'outstream',
            // Video dimensions supported by the video ad unit.
            // Each ad unit size is formatted as follows: [width, height].
            playerSize: [[300, 250]],
            // Content MIME types supported by the ad unit.
            mimes: ['video/mp4'],
            // Minimum accepted video ad duration (in seconds).
            minduration: 5,
            // Maximum accepted video ad duration (in seconds).
            maxduration: 35,
            // Video protocols supported by the ad unit (see the OpenRTB 2.5 specifications,
            // section 5.8).
            protocols: [2, 3]
        }
    },
    bids: [{
        bidder: 'adot',
        params: {}
    }]
}
```
### Native ad unit

Adot Bidder Adapter accepts native ad units using the following ad unit format:

```javascript
const adUnit = {
    code: 'test-div',
    mediaTypes: {
        native: {
            image: {
                // Field required status
                required: false,
                // Image dimensions supported by the native ad unit.
                // Each ad unit size is formatted as follows: [width, height].
                sizes: [100, 50]
            },
            title: {
                // Field required status
                required: false,
                // Maximum length of the title
                len: 140
            },
            sponsoredBy: {
                // Field required status
                required: false
            },
            clickUrl: {
                // Field required status
                required: false
            },
            body: {
                // Field required status
                required: false
            },
            icon: {
                // Field required status
                required: false,
                // Icon dimensions supported by the native ad unit.
                // Each ad unit size is formatted as follows: [width, height].
                sizes: [50, 50]
            }
        }
    },
    bids: [{
        bidder: 'adot',
        params: {}
    }]
}
```

## Bidder parameters

### Position

You can use the `position` to specify the position of the ad as a relative measure of visibility or prominence.

#### Accepted values

|Value|Description     |
|-----|----------------|
|0    | Unknown        |
|1    | Above the fold |
|3    | Below the fold |

Note that the position will default to `0` if the field is missing.

#### Example

```javascript
const adUnit = {
    code: 'test-div',
    mediaTypes: {
        banner: {
            // Dimensions supported by the banner ad unit.
            // Each ad unit size is formatted as follows: [width, height].
            sizes: [[300, 250]]
        }
    },
    bids: [{
        bidder: 'adot',
        params: {
            position: 0
        }
    }]
}
```

### PlacementId

#### Example

```javascript
const adUnit = {
    code: 'test-div',
    mediaTypes: {
        banner: {
            // Dimensions supported by the banner ad unit.
            // Each ad unit size is formatted as follows: [width, height].
            sizes: [[300, 250]]
        }
    },
    bids: [{
        bidder: 'adot',
        params: {
            placementId: 'eae245d'
        }
    }]
}
```

### PublisherId

You can set a publisherId using `pbjs.setBidderConfig` for the bidder `adot`

#### Example

```javascript
pbjs.setBidderConfig({
    bidders: ['adot'],
    config: {
        adot: {
            publisherId: '__MY_PUBLISHER_ID__'
        }
    }
});
```

### Specific publisher path

You can set a specific publisher path using `pbjs.setBidderConfig` for the bidder `adot`
The bidrequest will add this path to the bidder endpoint

#### Example

```javascript
pbjs.setBidderConfig({
    bidders: ['adot'],
    config: {
        adot: {
            publisherPath: '__MY_PUBLISHER_PATH__'
        }
    }
});
```